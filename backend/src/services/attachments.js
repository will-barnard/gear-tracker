// Attachment helpers shared by the item, bundle and attachment routes:
// signed URLs for <img>/<a> tags, covers for list views, and deletes that
// survive the NAS being asleep.
const crypto = require('node:crypto');
const { QueryTypes } = require('sequelize');
const { sequelize, Attachment } = require('../models');
const storage = require('./storage');

// <img src> can't carry the Bearer token, so file URLs are signed instead:
// HMAC(id, variant, expiry). Expiry is rounded to a 6-hour window so the URL
// for a given photo stays identical for hours and the browser cache works
// across page loads, while a leaked URL stops working within 12 hours.
const WINDOW_SECONDS = 6 * 3600;
const secret = () => process.env.FILE_URL_SECRET || process.env.JWT_SECRET || 'dev-only-secret';

function sign(id, variant, exp) {
  return crypto.createHmac('sha256', secret()).update(`${id}:${variant}:${exp}`).digest('base64url');
}

function signedPath(id, variant) {
  const now = Math.floor(Date.now() / 1000);
  const exp = (Math.floor(now / WINDOW_SECONDS) + 2) * WINDOW_SECONDS;
  return `/api/files/${id}/${variant}?e=${exp}&s=${sign(id, variant, exp)}`;
}

function verify(id, variant, exp, sig) {
  const e = Number(exp);
  if (!Number.isFinite(e) || e < Math.floor(Date.now() / 1000) || typeof sig !== 'string') return false;
  const expected = Buffer.from(sign(id, variant, e));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// Only these render inline on our origin. Everything else downloads — serving
// an uploaded HTML or SVG file inline would run its script as this app.
const INLINE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf']);

function present(a) {
  const plain = typeof a.get === 'function' ? a.get({ plain: true }) : a;
  const { storageKey, thumbKey, storageHash, thumbHash, userId, ...rest } = plain;
  return {
    ...rest,
    size: Number(plain.size),
    inline: INLINE_TYPES.has(plain.contentType),
    urls: {
      original: signedPath(plain.id, 'original'),
      thumb: signedPath(plain.id, thumbKey ? 'thumb' : 'original'),
      download: signedPath(plain.id, 'download')
    }
  };
}

async function listFor(owner, ownerId) {
  const rows = await Attachment.findAll({
    where: { [owner === 'item' ? 'itemId' : 'bundleId']: ownerId },
    order: [['kind', 'DESC'], ['position', 'ASC'], ['createdAt', 'ASC']]
  });
  return rows.map(present);
}

// First photo per owner, for list/grid views. One query regardless of page size.
async function coversFor(owner, ids) {
  if (!ids.length) return new Map();
  const col = owner === 'item' ? 'item_id' : 'bundle_id';
  const rows = await sequelize.query(`
    SELECT DISTINCT ON (${col}) id, ${col} AS owner_id, filename, content_type, thumb_key, width, height,
           COUNT(*) OVER (PARTITION BY ${col}) AS photo_count
    FROM attachments
    WHERE ${col} IN (:ids) AND kind = 'photo'
    ORDER BY ${col}, position, created_at
  `, { replacements: { ids }, type: QueryTypes.SELECT });
  const map = new Map();
  for (const r of rows) {
    map.set(r.owner_id, {
      id: r.id,
      width: r.width,
      height: r.height,
      photoCount: Number(r.photo_count),
      thumb: signedPath(r.id, r.thumb_key ? 'thumb' : 'original'),
      original: signedPath(r.id, 'original')
    });
  }
  return map;
}

// Delete the stored objects, then the rows. If storage is unreachable the keys
// go into pending_storage_deletes and the sweeper finishes the job later, so a
// sleeping NAS never blocks deleting an item.
async function destroyAttachments(rows, { transaction } = {}) {
  const keys = rows.flatMap((a) => [a.storageKey, a.thumbKey]).filter(Boolean);
  await deleteKeys(keys);
  if (rows.length) await Attachment.destroy({ where: { id: rows.map((a) => a.id) }, transaction });
}

async function deleteKeys(keys) {
  for (const key of keys) {
    try {
      await storage.remove(key);
    } catch (err) {
      await sequelize.query(`
        INSERT INTO pending_storage_deletes (storage_key, attempts, last_error)
        VALUES (:key, 1, :msg)
        ON CONFLICT (storage_key) DO UPDATE SET attempts = pending_storage_deletes.attempts + 1, last_error = EXCLUDED.last_error
      `, { replacements: { key, msg: err.message } });
    }
  }
}

async function sweepPendingDeletes() {
  if (!storage.isConfigured()) return;
  const rows = await sequelize.query(
    'SELECT storage_key FROM pending_storage_deletes ORDER BY created_at LIMIT 200',
    { type: QueryTypes.SELECT }
  );
  for (const { storage_key: key } of rows) {
    try {
      await storage.remove(key);
      await sequelize.query('DELETE FROM pending_storage_deletes WHERE storage_key = :key', { replacements: { key } });
    } catch (err) {
      if (err.status === 503) return; // still asleep; try the rest next time
      await sequelize.query(
        'UPDATE pending_storage_deletes SET attempts = attempts + 1, last_error = :msg WHERE storage_key = :key',
        { replacements: { key, msg: err.message } }
      );
    }
  }
}

function startSweeper() {
  const run = () => sweepPendingDeletes().catch((e) => console.error('[storage] sweep failed:', e.message));
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, 30 * 60 * 1000).unref();
}

module.exports = {
  INLINE_TYPES, signedPath, verify, present, listFor, coversFor,
  destroyAttachments, deleteKeys, sweepPendingDeletes, startSweeper
};
