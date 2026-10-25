// Nightly pg_dump → gzip → brew-bucket `backups` bucket (90-day retention is a
// bucket setting, so nothing here ever deletes old dumps). The dump streams
// from pg_dump through gzip into the upload; it never touches disk.
//
// Config:
//   BACKUP_BREW_BUCKET_KEY  bb_…  scoped read+write, restricted to the backups bucket.
//                           Separate from BREW_BUCKET_KEY on purpose: the uploads key
//                           shouldn't be able to read or overwrite database dumps.
//   BACKUP_BUCKET           backups (default)
//   BACKUP_HOUR             3 (default) — local hour in APP_TIMEZONE
//
// With no key set, backups are off and Settings says so.
const { spawn } = require('node:child_process');
const zlib = require('node:zlib');
const storage = require('./storage');
const { TZ } = require('./dates');

const BUCKET = process.env.BACKUP_BUCKET || 'backups';
const PREFIX = `${storage.PREFIX}/db/`;
const HOUR = Number(process.env.BACKUP_HOUR ?? 3);

let running = null;
let last = null; // { at, ok, key, size, error } — this process only; the bucket listing is the record

function isConfigured() {
  return !!(process.env.BREW_BUCKET_URL && process.env.BACKUP_BREW_BUCKET_KEY);
}

function stamp() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}`;
}

async function runBackup() {
  if (!isConfigured()) {
    throw Object.assign(new Error('Backups are not configured. Set BACKUP_BREW_BUCKET_KEY (and BREW_BUCKET_URL) on the backend.'), { status: 501 });
  }
  if (running) return running;

  running = (async () => {
    const key = `${PREFIX}gear-tracker-${stamp()}.sql.gz`;
    const dump = spawn('pg_dump', [
      '--no-owner', '--no-privileges', '--format=plain',
      '-h', process.env.DB_HOST || 'localhost',
      '-p', String(process.env.DB_PORT || 5432),
      '-U', process.env.DB_USER || 'postgres',
      process.env.DB_NAME || 'gear_tracker'
    ], { env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' } });

    let stderr = '';
    dump.stderr.on('data', (d) => { stderr += d; });
    const exited = new Promise((resolve, reject) => {
      dump.on('error', (err) => reject(err.code === 'ENOENT'
        ? new Error('pg_dump is not installed in the backend image')
        : err));
      dump.on('close', (code) => resolve(code));
    });

    const gz = dump.stdout.pipe(zlib.createGzip());
    let result;
    try {
      [result] = await Promise.all([
        storage.put(key, gz, { contentType: 'application/gzip', bucket: BUCKET, apiKey: process.env.BACKUP_BREW_BUCKET_KEY }),
        exited.then((code) => {
          if (code !== 0) throw new Error(`pg_dump exited ${code}: ${stderr.trim().slice(0, 500)}`);
        })
      ]);
    } catch (err) {
      // If the upload failed first, pg_dump is blocked writing into a pipe no
      // one reads; stop it.
      if (dump.exitCode === null) dump.kill();
      // A dump that failed partway may still have been uploaded; don't leave a
      // truncated file that looks like a good backup.
      await storage.remove(key, { bucket: BUCKET, apiKey: process.env.BACKUP_BREW_BUCKET_KEY }).catch(() => {});
      throw err;
    }
    return { key, size: result.size };
  })();

  try {
    const out = await running;
    last = { at: new Date().toISOString(), ok: true, ...out };
    console.log(`[backup] wrote ${out.key} (${out.size} bytes)`);
    return out;
  } catch (err) {
    last = { at: new Date().toISOString(), ok: false, error: err.message };
    throw err;
  } finally {
    running = null;
  }
}

async function listBackups(limit = 10) {
  if (!isConfigured()) return [];
  const { objects } = await storage.list(PREFIX, { bucket: BUCKET, apiKey: process.env.BACKUP_BREW_BUCKET_KEY, limit: 1000 });
  return objects
    .sort((a, b) => String(b.key).localeCompare(String(a.key)))
    .slice(0, limit)
    .map((o) => ({ key: o.key, size: Number(o.size), createdAt: o.created_at }));
}

function status() {
  return { configured: isConfigured(), bucket: BUCKET, hour: HOUR, timezone: TZ, running: !!running, last };
}

// ms until the next HOUR:00 in TZ.
function msUntilNextRun() {
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const next = new Date(local);
  next.setHours(HOUR, 0, 0, 0);
  if (next <= local) next.setDate(next.getDate() + 1);
  return next - local;
}

// A 503 means the NAS is asleep; that resolves itself, so retry a few times
// before giving up for the night.
async function scheduledRun(attempt = 1) {
  try {
    await runBackup();
  } catch (err) {
    console.error(`[backup] attempt ${attempt} failed: ${err.message}`);
    if (err.status === 503 && attempt < 4) {
      setTimeout(() => scheduledRun(attempt + 1), 15 * 60 * 1000).unref();
    }
  }
}

function startScheduler() {
  if (!isConfigured()) {
    console.log('[backup] BACKUP_BREW_BUCKET_KEY not set — scheduled backups are off');
    return;
  }
  const arm = () => {
    setTimeout(async () => {
      await scheduledRun();
      arm();
    }, msUntilNextRun()).unref();
  };
  arm();
  console.log(`[backup] nightly backups at ${String(HOUR).padStart(2, '0')}:00 ${TZ} → ${BUCKET}/${PREFIX}`);
}

module.exports = { runBackup, listBackups, status, startScheduler, isConfigured };
