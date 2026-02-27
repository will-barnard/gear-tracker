<template>
  <div class="stat-detail">
    <NavBar />
    <div class="container">
      <StatPageHeader :title="pageTitle" :subtitle="pageSubtitle" />

      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading data...</p>
      </div>

      <template v-else>
        <!-- Highlight cards -->
        <div class="highlights-row">
          <StatHighlight
            :value="highlight.value"
            :label="highlight.label"
            :format="highlight.format"
            :color="highlight.color"
            size="large"
          />
          <StatHighlight
            v-for="extra in extraHighlights"
            :key="extra.label"
            :value="extra.value"
            :label="extra.label"
            :format="extra.format"
            :color="extra.color"
            size="small"
          />
        </div>

        <!-- Charts section -->
        <div class="charts-section" v-if="timeSeriesChartData || breakdownChartData">
          <div class="charts-grid" :class="{ 'single-chart': !timeSeriesChartData || !breakdownChartData }">
            <TimeSeriesChart
              v-if="timeSeriesChartData"
              :chart-data="timeSeriesChartData"
              :title="timeSeriesTitle"
              :y-format="timeSeriesYFormat"
            />
            <CategoryBreakdownChart
              v-if="breakdownChartData"
              :chart-data="breakdownChartData"
              :title="breakdownTitle"
              :value-format="breakdownValueFormat"
            />
          </div>
        </div>

        <!-- Items table -->
        <StatItemsTable
          v-if="finalTableItems.length > 0 || !loading"
          :items="finalTableItems"
          :columns="tableColumns"
          :title="tableTitle"
          :default-sort-key="tableSortKey"
          :default-sort-dir="tableSortDir"
        />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import StatPageHeader from '@/components/stats/StatPageHeader.vue'
import StatHighlight from '@/components/stats/StatHighlight.vue'
import TimeSeriesChart from '@/components/stats/TimeSeriesChart.vue'
import CategoryBreakdownChart from '@/components/stats/CategoryBreakdownChart.vue'
import StatItemsTable from '@/components/stats/StatItemsTable.vue'
import { useItemStore } from '@/stores/item'
import {
  buildTimeSeries,
  groupByCategory,
  buildLineChartData,
  buildDoughnutChartData,
  CHART_COLORS
} from '@/utils/statCalculations'

const route = useRoute()
const itemStore = useItemStore()

const loading = ref(true)
const allItems = ref([])

const statType = computed(() => route.params.stat)

// ── Filtered item sets ──────────────────────────────
const ownedItems = computed(() => allItems.value.filter(i => i.status === 'owned'))
const soldItems = computed(() => allItems.value.filter(i => i.status === 'sold'))
const forSaleItems = computed(() => allItems.value.filter(i => i.status === 'for_sale'))

// ── Page header ─────────────────────────────────────
const pageTitle = computed(() => ({
  'inventory': 'Current Inventory',
  'collection-value': 'Collection Value',
  'sales': 'Completed Sales',
  'revenue': 'Sales Revenue',
  'profit': 'Profit & Loss',
  'for-sale': 'For Sale Items',
  'for-sale-investment': 'For Sale Cost Basis',
  'listings': 'Active Listings',
  'projected-profit': 'Projected Profit'
}[statType.value] || 'Stat Detail'))

const pageSubtitle = computed(() => ({
  'inventory': 'Items currently in your collection',
  'collection-value': 'Total invested in owned items over time',
  'sales': 'History of completed sales',
  'revenue': 'Total revenue earned from sales',
  'profit': 'Net profit or loss across all completed sales',
  'for-sale': 'Items currently listed or waiting to be sold',
  'for-sale-investment': 'Total cost basis of items you\'re selling',
  'listings': 'Items listed online vs. unlisted',
  'projected-profit': 'Expected profit if all for-sale items sell at asking price'
}[statType.value] || ''))

// ── Primary highlight ───────────────────────────────
const highlight = computed(() => {
  switch (statType.value) {
    case 'inventory':
      return { value: ownedItems.value.length, label: 'Items Owned', format: 'number', color: 'default' }
    case 'collection-value':
      return { value: sumField(ownedItems.value, 'effectiveCost'), label: 'Collection Value', format: 'currency', color: 'default' }
    case 'sales':
      return { value: soldItems.value.length, label: 'Items Sold', format: 'number', color: 'default' }
    case 'revenue':
      return { value: sumField(soldItems.value, 'effectiveSalePrice'), label: 'Total Revenue', format: 'currency', color: 'default' }
    case 'profit': {
      const p = sumField(soldItems.value, 'effectiveSalePrice') - sumField(soldItems.value, 'effectiveCost')
      return { value: p, label: 'Net Profit / Loss', format: 'signed-currency', color: 'auto' }
    }
    case 'for-sale':
      return { value: forSaleItems.value.length, label: 'For Sale', format: 'number', color: 'default' }
    case 'for-sale-investment':
      return { value: sumField(forSaleItems.value, 'effectiveCost'), label: 'Total Cost Basis', format: 'currency', color: 'default' }
    case 'listings':
      return { value: forSaleItems.value.filter(i => i.isListedOnline).length, label: 'Listed Online', format: 'number', color: 'default' }
    case 'projected-profit': {
      const pp = forSaleItems.value.reduce((s, i) => s + (i.expectedSalePrice || 0) - i.effectiveCost, 0)
      return { value: pp, label: 'Projected Profit', format: 'signed-currency', color: 'auto' }
    }
    default:
      return { value: 0, label: '', format: 'number', color: 'default' }
  }
})

// ── Extra highlights (secondary stats) ──────────────
const extraHighlights = computed(() => {
  switch (statType.value) {
    case 'inventory':
      return [
        { value: sumField(ownedItems.value, 'effectiveCost'), label: 'Total Value', format: 'currency', color: 'default' },
        { value: ownedItems.value.length ? sumField(ownedItems.value, 'effectiveCost') / ownedItems.value.length : 0, label: 'Avg Item Value', format: 'currency', color: 'default' }
      ]
    case 'collection-value': {
      const costs = ownedItems.value.map(i => i.effectiveCost)
      return [
        { value: costs.length ? Math.max(...costs) : 0, label: 'Highest Value Item', format: 'currency', color: 'default' },
        { value: costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0, label: 'Average Value', format: 'currency', color: 'default' }
      ]
    }
    case 'sales':
      return [
        { value: sumField(soldItems.value, 'effectiveSalePrice'), label: 'Total Revenue', format: 'currency', color: 'default' },
        { value: sumField(soldItems.value, 'effectiveSalePrice') - sumField(soldItems.value, 'effectiveCost'), label: 'Net Profit', format: 'signed-currency', color: 'auto' }
      ]
    case 'revenue': {
      const avg = soldItems.value.length ? sumField(soldItems.value, 'effectiveSalePrice') / soldItems.value.length : 0
      return [
        { value: soldItems.value.length, label: 'Sales Count', format: 'number', color: 'default' },
        { value: avg, label: 'Avg Sale Price', format: 'currency', color: 'default' }
      ]
    }
    case 'profit': {
      const margins = soldItems.value.map(i => i.effectiveSalePrice - i.effectiveCost)
      const best = margins.length ? Math.max(...margins) : 0
      const worst = margins.length ? Math.min(...margins) : 0
      return [
        { value: best, label: 'Best Deal', format: 'signed-currency', color: 'auto' },
        { value: worst, label: 'Worst Deal', format: 'signed-currency', color: 'auto' }
      ]
    }
    case 'for-sale':
      return [
        { value: sumField(forSaleItems.value, 'effectiveCost'), label: 'Cost Basis', format: 'currency', color: 'default' },
        { value: forSaleItems.value.filter(i => i.isListedOnline).length, label: 'Listed Online', format: 'number', color: 'default' }
      ]
    case 'for-sale-investment': {
      const avg = forSaleItems.value.length ? sumField(forSaleItems.value, 'effectiveCost') / forSaleItems.value.length : 0
      return [
        { value: avg, label: 'Avg Cost / Item', format: 'currency', color: 'default' },
        { value: forSaleItems.value.length, label: 'Item Count', format: 'number', color: 'default' }
      ]
    }
    case 'listings': {
      const unlisted = forSaleItems.value.filter(i => !i.isListedOnline).length
      return [
        { value: unlisted, label: 'Not Listed', format: 'number', color: 'default' },
        { value: forSaleItems.value.length, label: 'Total For Sale', format: 'number', color: 'default' }
      ]
    }
    case 'projected-profit': {
      const expectedRev = forSaleItems.value.reduce((s, i) => s + (i.expectedSalePrice || 0), 0)
      return [
        { value: expectedRev, label: 'Expected Revenue', format: 'currency', color: 'default' },
        { value: sumField(forSaleItems.value, 'effectiveCost'), label: 'Cost Basis', format: 'currency', color: 'default' }
      ]
    }
    default:
      return []
  }
})

// ── Time series chart ───────────────────────────────
const timeSeriesChartData = computed(() => {
  switch (statType.value) {
    case 'inventory': {
      // Net item count over time: +1 on purchase, -1 on sale
      const events = []
      allItems.value.forEach(item => {
        if (item.purchaseDate) events.push({ date: item.purchaseDate, value: 1 })
        if (item.status === 'sold' && item.saleDate) events.push({ date: item.saleDate, value: -1 })
      })
      const ts = buildTimeSeries(events)
      if (ts.labels.length < 2) return null
      return buildLineChartData(ts.labels, ts.data, 'Items in Collection', CHART_COLORS[0])
    }
    case 'collection-value': {
      // Portfolio value over time: +cost on purchase, -cost on sale
      const events = []
      allItems.value.forEach(item => {
        if (item.purchaseDate) events.push({ date: item.purchaseDate, value: item.effectiveCost })
        if (item.status === 'sold' && item.saleDate) events.push({ date: item.saleDate, value: -item.effectiveCost })
      })
      const ts = buildTimeSeries(events)
      if (ts.labels.length < 2) return null
      return buildLineChartData(ts.labels, ts.data, 'Collection Value', CHART_COLORS[0])
    }
    case 'sales': {
      const events = soldItems.value
        .filter(i => i.saleDate)
        .map(i => ({ date: i.saleDate, value: 1 }))
      const ts = buildTimeSeries(events)
      if (ts.labels.length < 2) return null
      return buildLineChartData(ts.labels, ts.data, 'Cumulative Sales', CHART_COLORS[2])
    }
    case 'revenue': {
      const events = soldItems.value
        .filter(i => i.saleDate)
        .map(i => ({ date: i.saleDate, value: i.effectiveSalePrice }))
      const ts = buildTimeSeries(events)
      if (ts.labels.length < 2) return null
      return buildLineChartData(ts.labels, ts.data, 'Cumulative Revenue', CHART_COLORS[1])
    }
    case 'profit': {
      const events = soldItems.value
        .filter(i => i.saleDate)
        .map(i => ({ date: i.saleDate, value: i.effectiveSalePrice - i.effectiveCost }))
      const ts = buildTimeSeries(events)
      if (ts.labels.length < 2) return null
      return buildLineChartData(ts.labels, ts.data, 'Cumulative Profit', CHART_COLORS[1])
    }
    default:
      return null
  }
})

const timeSeriesTitle = computed(() => ({
  'inventory': 'Inventory Count Over Time',
  'collection-value': 'Collection Value Over Time',
  'sales': 'Sales Over Time',
  'revenue': 'Cumulative Revenue',
  'profit': 'Cumulative Profit / Loss'
}[statType.value] || ''))

const timeSeriesYFormat = computed(() => {
  return ['collection-value', 'revenue', 'profit'].includes(statType.value) ? 'currency' : 'number'
})

// ── Breakdown chart ─────────────────────────────────
const breakdownChartData = computed(() => {
  let items, valueFn
  switch (statType.value) {
    case 'inventory':
      items = ownedItems.value
      valueFn = () => 1
      break
    case 'collection-value':
      items = ownedItems.value
      valueFn = (i) => i.effectiveCost
      break
    case 'sales':
      items = soldItems.value
      valueFn = () => 1
      break
    case 'revenue':
      items = soldItems.value
      valueFn = (i) => i.effectiveSalePrice
      break
    case 'profit':
      items = soldItems.value
      valueFn = (i) => i.effectiveSalePrice - i.effectiveCost
      break
    case 'for-sale':
      items = forSaleItems.value
      valueFn = () => 1
      break
    case 'for-sale-investment':
      items = forSaleItems.value
      valueFn = (i) => i.effectiveCost
      break
    case 'listings': {
      // Special: listed vs not listed (not by category)
      const listed = forSaleItems.value.filter(i => i.isListedOnline).length
      const unlisted = forSaleItems.value.length - listed
      if (listed + unlisted === 0) return null
      return buildDoughnutChartData(
        ['Listed Online', 'Not Listed'],
        [listed, unlisted],
        [CHART_COLORS[1], CHART_COLORS[6]]
      )
    }
    case 'projected-profit':
      items = forSaleItems.value
      valueFn = (i) => (i.expectedSalePrice || 0) - i.effectiveCost
      break
    default:
      return null
  }

  if (!items || items.length === 0) return null
  const grouped = groupByCategory(items, valueFn)
  if (grouped.labels.length === 0) return null
  return buildDoughnutChartData(grouped.labels, grouped.data, grouped.colors)
})

const breakdownTitle = computed(() => ({
  'inventory': 'By Category',
  'collection-value': 'Value by Category',
  'sales': 'Sales by Category',
  'revenue': 'Revenue by Category',
  'profit': 'Profit by Category',
  'for-sale': 'For Sale by Category',
  'for-sale-investment': 'Cost by Category',
  'listings': 'Listing Status',
  'projected-profit': 'Projected Profit by Category'
}[statType.value] || ''))

const breakdownValueFormat = computed(() => {
  return ['inventory', 'sales', 'for-sale', 'listings'].includes(statType.value) ? 'number' : 'currency'
})

// ── Items table ─────────────────────────────────────
const tableItems = computed(() => {
  switch (statType.value) {
    case 'inventory':
    case 'collection-value':
      return ownedItems.value
    case 'sales':
    case 'revenue':
    case 'profit':
      return soldItems.value
    case 'for-sale':
    case 'for-sale-investment':
    case 'listings':
    case 'projected-profit':
      return forSaleItems.value
    default:
      return []
  }
})

const tableColumns = computed(() => {
  switch (statType.value) {
    case 'inventory':
      return [
        { key: 'name', label: 'Name' },
        { key: 'category.name', label: 'Category' },
        { key: 'brand', label: 'Brand' },
        { key: 'purchaseDate', label: 'Purchased', format: 'date' },
        { key: 'effectiveCost', label: 'Cost', format: 'currency' }
      ]
    case 'collection-value':
      return [
        { key: 'name', label: 'Name' },
        { key: 'category.name', label: 'Category' },
        { key: 'effectiveCost', label: 'Total Cost', format: 'currency' },
        { key: 'purchasePrice', label: 'Purchase Price', format: 'currency' },
        { key: 'additionalCostTotal', label: 'Add\'l Costs', format: 'currency' }
      ]
    case 'sales':
      return [
        { key: 'name', label: 'Name' },
        { key: 'category.name', label: 'Category' },
        { key: 'saleDate', label: 'Sale Date', format: 'date' },
        { key: 'effectiveSalePrice', label: 'Sale Price', format: 'currency' },
        { key: 'effectiveCost', label: 'Cost', format: 'currency' }
      ]
    case 'revenue':
      return [
        { key: 'name', label: 'Name' },
        { key: 'category.name', label: 'Category' },
        { key: 'saleDate', label: 'Sale Date', format: 'date' },
        { key: 'effectiveSalePrice', label: 'Revenue', format: 'currency' }
      ]
    case 'profit':
      return [
        { key: 'name', label: 'Name' },
        { key: 'category.name', label: 'Category' },
        { key: 'effectiveSalePrice', label: 'Sale Price', format: 'currency' },
        { key: 'effectiveCost', label: 'Cost', format: 'currency' },
        { key: '_profit', label: 'Profit', format: 'signed-currency' }
      ]
    case 'for-sale':
      return [
        { key: 'name', label: 'Name' },
        { key: 'category.name', label: 'Category' },
        { key: 'expectedSalePrice', label: 'Asking Price', format: 'currency' },
        { key: 'isListedOnline', label: 'Listed', format: 'boolean' }
      ]
    case 'for-sale-investment':
      return [
        { key: 'name', label: 'Name' },
        { key: 'category.name', label: 'Category' },
        { key: 'effectiveCost', label: 'Total Cost', format: 'currency' },
        { key: 'purchasePrice', label: 'Purchase Price', format: 'currency' },
        { key: 'additionalCostTotal', label: 'Add\'l Costs', format: 'currency' }
      ]
    case 'listings':
      return [
        { key: 'name', label: 'Name' },
        { key: 'category.name', label: 'Category' },
        { key: 'isListedOnline', label: 'Listed Online', format: 'boolean' },
        { key: 'expectedSalePrice', label: 'Asking Price', format: 'currency' }
      ]
    case 'projected-profit':
      return [
        { key: 'name', label: 'Name' },
        { key: 'category.name', label: 'Category' },
        { key: 'expectedSalePrice', label: 'Asking Price', format: 'currency' },
        { key: 'effectiveCost', label: 'Cost', format: 'currency' },
        { key: '_projectedProfit', label: 'Projected Profit', format: 'signed-currency' }
      ]
    default:
      return []
  }
})

const tableTitle = computed(() => ({
  'inventory': 'Owned Items',
  'collection-value': 'Items by Value',
  'sales': 'Sold Items',
  'revenue': 'Sales by Revenue',
  'profit': 'Deals by Profit',
  'for-sale': 'For Sale Items',
  'for-sale-investment': 'Cost Breakdown',
  'listings': 'Listing Status',
  'projected-profit': 'Projected Margins'
}[statType.value] || 'Items'))

const tableSortKey = computed(() => ({
  'inventory': 'purchaseDate',
  'collection-value': 'effectiveCost',
  'sales': 'saleDate',
  'revenue': 'effectiveSalePrice',
  'profit': '_profit',
  'for-sale': 'name',
  'for-sale-investment': 'effectiveCost',
  'listings': 'isListedOnline',
  'projected-profit': '_projectedProfit'
}[statType.value] || ''))

const tableSortDir = computed(() => 'desc')

// ── Helpers ─────────────────────────────────────────
function sumField(items, field) {
  return items.reduce((sum, i) => sum + (parseFloat(i[field]) || 0), 0)
}

// Enrich items with computed virtual fields for table sorting
const enrichedTableItems = computed(() => {
  return tableItems.value.map(item => ({
    ...item,
    _profit: item.effectiveSalePrice - item.effectiveCost,
    _projectedProfit: (item.expectedSalePrice || 0) - item.effectiveCost
  }))
})

// Override tableItems in the template to use enriched version
// We do this by redefining the computed used by the template
const finalTableItems = computed(() => enrichedTableItems.value)

// ── Data loading ────────────────────────────────────
async function loadData() {
  loading.value = true
  try {
    const response = await itemStore.getStatsDetail()
    allItems.value = response.items || []
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
watch(statType, loadData)
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 0.75rem;
}

@media (min-width: 480px) {
  .container {
    padding: 1.25rem 1rem;
  }
}

@media (min-width: 769px) {
  .container {
    padding: 2rem;
  }
}

.highlights-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.highlights-row > :first-child {
  grid-column: 1 / -1;
}

@media (min-width: 480px) {
  .highlights-row {
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }
}

@media (min-width: 640px) {
  .highlights-row {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .highlights-row > :first-child {
    grid-column: auto;
  }
}

.charts-section {
  margin-bottom: 1rem;
}

@media (min-width: 640px) {
  .charts-section {
    margin-bottom: 1.5rem;
  }
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .charts-grid {
    gap: 1rem;
  }
}

@media (min-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr 1fr;
  }

  .charts-grid.single-chart {
    grid-template-columns: 1fr;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 1rem;
}

.loading-container p {
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
