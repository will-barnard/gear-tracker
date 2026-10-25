// Display formatting. Money and dates go through here so every screen shows
// them the same way.

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function money(value, { whole = false, dash = '—' } = {}) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return dash
  return (whole ? usdWhole : usd).format(Number(value))
}

export function signedMoney(value, opts) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  return (n > 0 ? '+' : n < 0 ? '−' : '') + money(Math.abs(n), opts)
}

export function pct(value, { signed = false } = {}) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value) * 100
  const s = `${Math.abs(n) >= 100 ? Math.round(n) : n.toFixed(1)}%`
  return signed && n > 0 ? `+${s}` : s
}

export const tone = (n) => (n == null ? '' : n > 0 ? 'positive' : n < 0 ? 'negative' : '')

// Dates from the API are calendar dates ('YYYY-MM-DD'). new Date('2026-03-05')
// parses as midnight UTC, which is the 4th in Central — so build the Date from
// its parts in local time instead.
export function parseDate(value) {
  if (!value) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function date(value, { short = false } = {}) {
  const d = parseDate(value)
  if (!d) return '—'
  return d.toLocaleDateString('en-US', short
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' })
}

export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function days(n) {
  if (n == null) return '—'
  if (n < 1) return 'today'
  if (n < 60) return `${n} day${n === 1 ? '' : 's'}`
  const months = Math.round(n / 30.4)
  if (months < 24) return `${months} mo`
  return `${(n / 365).toFixed(1)} yr`
}

export function fileSize(bytes) {
  const n = Number(bytes)
  if (!n) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1048576).toFixed(1)} MB`
}

// Pulls a human-readable message out of an axios error.
export function errorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data
  if (typeof data?.error === 'string') return data.error
  if (typeof data?.error?.message === 'string') return data.error.message
  if (Array.isArray(data?.errors) && data.errors.length) return data.errors.map((e) => e.msg || e.message).join('; ')
  if (err?.code === 'ERR_NETWORK') return "Can't reach the server"
  return err?.message && !err.response ? err.message : fallback
}

export const STATUS_LABELS = { owned: 'Owned', for_sale: 'For sale', sold: 'Sold' }
export const statusLabel = (s) => STATUS_LABELS[s] || s

export const PLATFORMS = ['Reverb', 'eBay', 'Facebook Marketplace', 'Craigslist', 'Shopify', 'Instagram', 'In person', 'Other']

export function addDaysISO(n, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
