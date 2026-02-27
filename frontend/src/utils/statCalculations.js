/**
 * Stat calculation utilities for chart data and stat detail views.
 * Used by reusable stat components across the application.
 */

export const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1'
]

/**
 * Build a cumulative time series from date/value events, grouped by month.
 * Fills gaps so the line chart is continuous.
 */
export function buildTimeSeries(events) {
  const valid = events.filter(e => e.date)
  if (valid.length === 0) return { labels: [], data: [] }

  const sorted = [...valid].sort((a, b) => new Date(a.date) - new Date(b.date))

  // Accumulate per month
  const monthly = new Map()
  let running = 0
  sorted.forEach(e => {
    const d = new Date(e.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    running += e.value
    monthly.set(key, running)
  })

  // Fill in missing months
  const keys = Array.from(monthly.keys())
  const start = new Date(keys[0] + '-01')
  const end = new Date(keys[keys.length - 1] + '-01')

  const labels = []
  const data = []
  let cur = new Date(start)
  let lastVal = 0

  while (cur <= end) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
    if (monthly.has(key)) lastVal = monthly.get(key)
    labels.push(formatMonthLabel(key))
    data.push(Math.round(lastVal * 100) / 100)
    cur.setMonth(cur.getMonth() + 1)
  }

  return { labels, data }
}

function formatMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

/**
 * Group items by category and sum a value function.
 * Returns { labels, data, colors } for a doughnut chart.
 */
export function groupByCategory(items, valueFn = () => 1) {
  const groups = {}
  items.forEach(item => {
    const cat = item.category?.name || 'Uncategorized'
    if (!groups[cat]) groups[cat] = 0
    groups[cat] += valueFn(item)
  })

  const sorted = Object.entries(groups).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))

  return {
    labels: sorted.map(([label]) => label),
    data: sorted.map(([, value]) => Math.round(value * 100) / 100),
    colors: sorted.map((_, i) => CHART_COLORS[i % CHART_COLORS.length])
  }
}

/**
 * Construct a Chart.js Line chart data object.
 */
export function buildLineChartData(labels, data, label, color = '#3B82F6') {
  return {
    labels,
    datasets: [{
      label,
      data,
      borderColor: color,
      backgroundColor: hexToRgba(color, 0.08),
      fill: true,
      tension: 0.35,
      pointRadius: data.length > 24 ? 0 : 3,
      pointHoverRadius: 5,
      borderWidth: 2
    }]
  }
}

/**
 * Construct a Chart.js Doughnut chart data object.
 */
export function buildDoughnutChartData(labels, data, colors) {
  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderWidth: 2,
      borderColor: '#fff',
      hoverOffset: 6
    }]
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '$0.00'
  const abs = Math.abs(value)
  const formatted = '$' + abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return value < 0 ? '-' + formatted : formatted
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
