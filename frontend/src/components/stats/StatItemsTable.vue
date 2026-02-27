<template>
  <div class="items-table-wrapper card">
    <div class="table-header">
      <h3 v-if="title" class="table-title">{{ title }}</h3>
      <span class="table-count">{{ items.length }} item{{ items.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="items.length === 0" class="empty-state">
      <p>No items to display.</p>
    </div>

    <!-- Mobile card layout -->
    <div v-else class="mobile-cards">
      <div
        v-for="item in sortedItems"
        :key="'m-' + item.id"
        class="mobile-card"
        @click="$router.push(`/items/${item.id}`)"
      >
        <div class="mobile-card-name">{{ item.name || '—' }}</div>
        <div class="mobile-card-fields">
          <div
            v-for="col in columns.slice(1)"
            :key="col.key"
            class="mobile-card-field"
          >
            <span class="mobile-field-label">{{ col.label }}</span>
            <span class="mobile-field-value" :class="getFieldClass(col, item)">
              <template v-if="col.format === 'currency'">{{ fmtCurrency(getVal(item, col.key)) }}</template>
              <template v-else-if="col.format === 'signed-currency'">
                {{ (getVal(item, col.key) >= 0 ? '+' : '') + fmtCurrency(getVal(item, col.key)) }}
              </template>
              <template v-else-if="col.format === 'date'">{{ fmtDate(getVal(item, col.key)) }}</template>
              <template v-else-if="col.format === 'boolean'">
                <span :class="getVal(item, col.key) ? 'badge badge-yes' : 'badge badge-no'">
                  {{ getVal(item, col.key) ? 'Yes' : 'No' }}
                </span>
              </template>
              <template v-else>{{ getVal(item, col.key) ?? '—' }}</template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop table layout -->
    <div v-if="items.length > 0" class="table-scroll">
      <table class="data-table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :class="{ sortable: col.sortable !== false, active: sortKey === col.key }"
              @click="col.sortable !== false && toggleSort(col.key)"
            >
              {{ col.label }}
              <span v-if="sortKey === col.key" class="sort-indicator">
                {{ sortDir === 'asc' ? '▲' : '▼' }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in sortedItems"
            :key="item.id"
            class="data-row"
            @click="$router.push(`/items/${item.id}`)"
          >
            <td v-for="col in columns" :key="col.key" :class="col.cellClass">
              <template v-if="col.format === 'currency'">
                {{ fmtCurrency(getVal(item, col.key)) }}
              </template>
              <template v-else-if="col.format === 'signed-currency'">
                <span :class="getVal(item, col.key) >= 0 ? 'positive' : 'negative'">
                  {{ (getVal(item, col.key) >= 0 ? '+' : '') + fmtCurrency(getVal(item, col.key)) }}
                </span>
              </template>
              <template v-else-if="col.format === 'date'">
                {{ fmtDate(getVal(item, col.key)) }}
              </template>
              <template v-else-if="col.format === 'boolean'">
                <span :class="getVal(item, col.key) ? 'badge badge-yes' : 'badge badge-no'">
                  {{ getVal(item, col.key) ? 'Yes' : 'No' }}
                </span>
              </template>
              <template v-else>
                {{ getVal(item, col.key) ?? '—' }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatCurrency, formatDate } from '@/utils/statCalculations'

const props = defineProps({
  items: { type: Array, default: () => [] },
  columns: { type: Array, required: true },
  title: { type: String, default: '' },
  defaultSortKey: { type: String, default: '' },
  defaultSortDir: { type: String, default: 'desc' }
})

const sortKey = ref(props.defaultSortKey || (props.columns[0]?.key ?? ''))
const sortDir = ref(props.defaultSortDir)

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function getVal(item, key) {
  return key.split('.').reduce((obj, k) => obj?.[k], item)
}

const fmtCurrency = formatCurrency
const fmtDate = formatDate

function getFieldClass(col, item) {
  if (col.format === 'signed-currency') {
    return getVal(item, col.key) >= 0 ? 'positive' : 'negative'
  }
  return ''
}

const sortedItems = computed(() => {
  if (!sortKey.value) return props.items
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...props.items].sort((a, b) => {
    let va = getVal(a, sortKey.value)
    let vb = getVal(b, sortKey.value)
    if (va == null) return 1
    if (vb == null) return -1
    if (typeof va === 'string') return va.localeCompare(vb) * dir
    return (va - vb) * dir
  })
})
</script>

<style scoped>
.items-table-wrapper {
  padding: 1rem 0.75rem;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.table-title {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 600;
}

.table-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* Mobile card layout */
.mobile-cards {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.mobile-card {
  background: var(--background);
  border-radius: 0.375rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.1s;
  -webkit-tap-highlight-color: transparent;
}

.mobile-card:active {
  background-color: var(--border-color);
}

.mobile-card-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.mobile-card-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.375rem 0.75rem;
}

.mobile-card-field {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.mobile-field-label {
  font-size: 0.625rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-secondary);
  font-weight: 600;
}

.mobile-field-value {
  font-size: 0.8125rem;
  color: var(--text-primary);
}

/* Desktop table layout - hidden on mobile */
.table-scroll {
  display: none;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

@media (min-width: 640px) {
  .items-table-wrapper {
    padding: 1.25rem 1rem;
  }

  .table-header {
    margin-bottom: 1rem;
  }

  .mobile-cards {
    display: none;
  }

  .table-scroll {
    display: block;
  }
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.data-table th {
  text-align: left;
  padding: 0.625rem 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 2px solid var(--border-color);
  white-space: nowrap;
  user-select: none;
}

.data-table th.sortable {
  cursor: pointer;
}

.data-table th.sortable:hover {
  color: var(--text-primary);
}

.data-table th.active {
  color: var(--primary-color);
}

.sort-indicator {
  font-size: 0.625rem;
  margin-left: 0.25rem;
}

.data-row {
  cursor: pointer;
  transition: background-color 0.1s;
}

.data-row:hover {
  background-color: var(--background);
}

.data-table td {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
  white-space: nowrap;
}

.positive {
  color: var(--success-color);
  font-weight: 600;
}

.negative {
  color: var(--danger-color);
  font-weight: 600;
}

.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
}

.badge-yes {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success-color);
}

.badge-no {
  background: rgba(107, 114, 128, 0.1);
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 1.5rem 1rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

@media (min-width: 640px) {
  .items-table-wrapper {
    padding: 1.5rem;
  }

  .data-table {
    font-size: 0.875rem;
  }
}
</style>
