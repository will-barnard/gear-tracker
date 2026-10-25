// Calendar-date helpers. Purchase/sale dates are plain 'YYYY-MM-DD' strings
// end to end, so "today" has to come from the owner's timezone rather than the
// container's (which is UTC on Beachhead).
const TZ = process.env.APP_TIMEZONE || 'America/Chicago';

function today(tz = TZ) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date());
}

// Accepts 'YYYY-MM-DD' or an ISO timestamp and returns 'YYYY-MM-DD', or null.
function toDateOnly(value) {
  if (value == null || value === '') return null;
  const s = String(value);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : null;
}

function daysBetween(from, to) {
  const a = toDateOnly(from);
  const b = toDateOnly(to);
  if (!a || !b) return null;
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

function addDays(date, n) {
  const [y, m, d] = toDateOnly(date).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

module.exports = { TZ, today, toDateOnly, daysBetween, addDays };
