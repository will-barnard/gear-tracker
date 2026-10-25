<template>
  <div class="items-list">
    <div class="page-header">
      <div>
        <h2>{{ title }}</h2>
        <p class="sub">
          <template v-if="!itemStore.loading || itemStore.pagination.total">{{ itemStore.pagination.total }} item{{ itemStore.pagination.total === 1 ? '' : 's' }}</template>
          <template v-if="activeFilterCount"> · filtered</template>
        </p>
      </div>
      <div class="page-actions">
        <div class="segmented" role="group" aria-label="View">
          <button :class="{ active: view === 'grid' }" @click="setView('grid')" title="Grid"><AppIcon name="grid" :size="15" /><span class="hide-sm">Grid</span></button>
          <button :class="{ active: view === 'table' }" @click="setView('table')" title="Table"><AppIcon name="list" :size="15" /><span class="hide-sm">Table</span></button>
        </div>
      </div>
    </div>

    <div class="filters">
      <div class="search">
        <AppIcon name="search" :size="16" class="search-icon" />
        <input v-model="searchText" type="search" class="form-input" placeholder="Search name, brand, model, serial…" aria-label="Search" />
      </div>
      <button class="btn btn-secondary filter-toggle" @click="showFilters = !showFilters" :aria-expanded="showFilters">
        <AppIcon name="filter" :size="15" /> Filters<span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
      </button>
      <div class="filter-fields" :class="{ open: showFilters }">
        <select v-if="!filterByStatus" v-model="q.status" class="form-input" aria-label="Status">
          <option value="">All statuses</option>
          <option value="owned">Owned</option>
          <option value="for_sale">For sale</option>
          <option value="sold">Sold</option>
        </select>
        <select v-model="q.category" class="form-input" aria-label="Category">
          <option value="">All categories</option>
          <option v-for="cat in categoryStore.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          <option value="none">Uncategorized</option>
        </select>
        <select v-model="q.intent" class="form-input" aria-label="Keep or flip">
          <option value="">Keepers &amp; flips</option>
          <option value="flip">Flips</option>
          <option value="keep">Keepers</option>
        </select>
        <select v-model="sortKey" class="form-input" aria-label="Sort">
          <option value="date:DESC">Newest activity</option>
          <option value="date:ASC">Oldest activity</option>
          <option value="createdAt:DESC">Recently added</option>
          <option value="name:ASC">Name A–Z</option>
          <option value="cost:DESC">Cost: high → low</option>
          <option value="cost:ASC">Cost: low → high</option>
          <option v-if="filterByStatus === 'for_sale'" value="listedAt:ASC">Listed longest</option>
        </select>
      </div>
      <div v-if="filterByStatus === 'for_sale'" class="quick">
        <button class="chip" :class="{ on: q.stale }" @click="q.stale = q.stale ? '' : '60'">
          <AppIcon name="clock" :size="14" /> Listed 60+ days
        </button>
      </div>
      <button v-if="activeFilterCount" class="btn btn-ghost btn-sm" @click="clearFilters">Clear</button>
    </div>

    <div v-if="itemStore.loading && !itemStore.items.length" class="loading-block">
      <div class="spinner"></div>
      <p>Loading items…</p>
    </div>

    <div v-else-if="!itemStore.items.length" class="empty-state card">
      <AppIcon name="package" :size="32" class="icon" />
      <p>{{ activeFilterCount || searchText ? 'Nothing matches those filters.' : emptyMessage }}</p>
      <router-link v-if="!activeFilterCount && !searchText" to="/items/new" class="btn btn-primary" style="margin-top: 1rem">
        <AppIcon name="plus" :size="16" /> Add an item
      </router-link>
    </div>

    <!-- Grid -->
    <div v-else-if="view === 'grid'" class="items-grid" :class="{ refreshing: itemStore.loading }">
      <router-link v-for="item in itemStore.items" :key="item.id" :to="`/items/${item.id}`" class="item-card card card-link">
        <div class="cover thumb">
          <img v-if="item.coverPhoto" :src="fileUrl(item.coverPhoto.thumb)" :alt="item.name" loading="lazy" />
          <AppIcon v-else name="image" :size="28" />
          <span v-if="item.coverPhoto?.photoCount > 1" class="photo-count"><AppIcon name="image" :size="12" /> {{ item.coverPhoto.photoCount }}</span>
        </div>
        <div class="card-body">
          <div class="badges">
            <span class="badge" :class="item.status">{{ statusLabel(item.status) }}</span>
            <span v-if="item.intent === 'keep'" class="badge keep">Keeper</span>
            <span v-if="item.status === 'for_sale' && item.isListedOnline" class="badge active">Listed</span>
          </div>
          <h3 class="name">{{ item.name }}</h3>
          <p v-if="item.brand || item.model" class="meta">{{ [item.brand, item.model].filter(Boolean).join(' · ') }}</p>
          <p v-if="item.category || item.purchaseBundle" class="meta tags">
            <span v-if="item.category" class="tag"><span class="cat-dot" :style="{ background: item.category.color }"></span>{{ item.category.name }}</span>
            <span v-if="item.purchaseBundle" class="tag"><AppIcon name="package" :size="12" />{{ item.purchaseBundle.name }}</span>
          </p>
          <div class="figures">
            <div>
              <span class="lbl">Cost</span>
              <span class="money">{{ money(item.costing.totalCost) }}</span>
            </div>
            <div v-if="item.costing.saleKind">
              <span class="lbl">{{ item.costing.saleKind === 'sold' ? 'Sold' : 'Asking' }}</span>
              <span class="money">{{ money(item.costing.grossSale) }}</span>
            </div>
            <div v-else-if="item.intent === 'keep' && item.estimatedValue">
              <span class="lbl">Value</span>
              <span class="money">{{ money(item.estimatedValue) }}</span>
            </div>
            <div v-if="item.costing.profit != null">
              <span class="lbl">{{ item.costing.saleKind === 'sold' ? 'Profit' : 'Proj.' }}</span>
              <span class="money" :class="tone(item.costing.profit)">{{ signedMoney(item.costing.profit, { whole: true }) }}</span>
            </div>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Table -->
    <div v-else class="card table-card" :class="{ refreshing: itemStore.loading }">
      <div class="table-wrap">
        <table class="data-table items-table">
          <thead>
            <tr>
              <th class="thumb-col"><span class="sr-only">Photo</span></th>
              <th>Item</th>
              <th class="hide-md">Category</th>
              <th>Status</th>
              <th class="r">Cost</th>
              <th class="r">{{ filterByStatus === 'for_sale' ? 'Asking' : 'Sale' }}</th>
              <th class="r hide-sm">Profit</th>
              <th class="r hide-md">{{ filterByStatus === 'for_sale' ? 'Listed' : 'Held' }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in itemStore.items" :key="item.id" class="clickable" @click="open(item, $event)">
              <td class="thumb-col">
                <div class="thumb small-thumb">
                  <img v-if="item.coverPhoto" :src="fileUrl(item.coverPhoto.thumb)" alt="" loading="lazy" />
                  <AppIcon v-else name="image" :size="16" />
                </div>
              </td>
              <td>
                <router-link :to="`/items/${item.id}`" class="row-link">{{ item.name }}</router-link>
                <div class="small faint">
                  {{ [item.brand, item.model].filter(Boolean).join(' · ') }}
                  <span v-if="item.purchaseBundle"> · <AppIcon name="package" :size="11" /> {{ item.purchaseBundle.name }}</span>
                </div>
              </td>
              <td class="hide-md">
                <span v-if="item.category" class="tag"><span class="cat-dot" :style="{ background: item.category.color }"></span>{{ item.category.name }}</span>
                <span v-else class="faint">—</span>
              </td>
              <td>
                <span class="badge" :class="item.status">{{ statusLabel(item.status) }}</span>
                <span v-if="item.intent === 'keep'" class="badge keep" style="margin-left: 0.25rem">Keep</span>
              </td>
              <td class="r money">{{ money(item.costing.totalCost) }}</td>
              <td class="r money">
                <template v-if="item.costing.saleKind">{{ money(item.costing.grossSale) }}</template>
                <span v-else class="faint">—</span>
              </td>
              <td class="r money hide-sm" :class="tone(item.costing.profit)">
                <template v-if="item.costing.profit != null">{{ signedMoney(item.costing.profit) }}</template>
                <span v-else class="faint">—</span>
              </td>
              <td class="r hide-md nowrap" :class="{ stale: filterByStatus === 'for_sale' && item.costing.daysListed >= 60 }">
                {{ filterByStatus === 'for_sale' ? days(item.costing.daysListed) : days(item.costing.daysHeld) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="itemStore.pagination.totalPages > 1" class="pagination">
      <button @click="changePage(page - 1)" :disabled="page <= 1" class="btn btn-secondary btn-sm">
        <AppIcon name="chevron-left" :size="16" /> Previous
      </button>
      <span class="small muted">Page {{ page }} of {{ itemStore.pagination.totalPages }}</span>
      <button @click="changePage(page + 1)" :disabled="page >= itemStore.pagination.totalPages" class="btn btn-secondary btn-sm">
        Next <AppIcon name="chevron-right" :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup>
// Filters, sort, view and page live in the URL query, so back/refresh and
// shared links keep them.
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useItemStore } from '@/stores/item'
import { useCategoryStore } from '@/stores/category'
import AppIcon from './AppIcon.vue'
import { fileUrl } from '@/services/attachments'
import { money, signedMoney, tone, days, statusLabel, addDaysISO } from '@/utils/format'

const props = defineProps({
  title: { type: String, default: 'Items' },
  filterByStatus: { type: String, default: '' },
  emptyMessage: { type: String, default: 'No items yet. Add your first piece of gear to get started.' }
})

const route = useRoute()
const router = useRouter()
const itemStore = useItemStore()
const categoryStore = useCategoryStore()

const VIEW_KEY = 'gt.items.view'
const readView = () => {
  try { return localStorage.getItem(VIEW_KEY) } catch { return null }
}

const q = reactive({
  search: route.query.q || '',
  status: route.query.status || '',
  category: route.query.category || '',
  intent: route.query.intent || '',
  sort: route.query.sort || (props.filterByStatus === 'for_sale' ? 'date' : 'date'),
  dir: route.query.dir || 'DESC',
  stale: route.query.stale || ''
})
const page = ref(Number(route.query.page) || 1)
const view = ref(route.query.view || readView() || 'grid')
const searchText = ref(q.search)
const showFilters = ref(false)

const sortKey = computed({
  get: () => `${q.sort}:${q.dir}`,
  set: (v) => {
    const [s, d] = v.split(':')
    q.sort = s
    q.dir = d
  }
})

const activeFilterCount = computed(() =>
  [q.status, q.category, q.intent, q.stale].filter(Boolean).length
)

function setView(v) {
  view.value = v
  try { localStorage.setItem(VIEW_KEY, v) } catch { /* private mode */ }
  syncUrl()
}

function clearFilters() {
  Object.assign(q, { status: '', category: '', intent: '', stale: '' })
  searchText.value = ''
}

function syncUrl() {
  const query = {
    q: q.search || undefined,
    status: q.status || undefined,
    category: q.category || undefined,
    intent: q.intent || undefined,
    sort: q.sort !== 'date' ? q.sort : undefined,
    dir: q.dir !== 'DESC' ? q.dir : undefined,
    stale: q.stale || undefined,
    view: view.value !== 'grid' ? view.value : undefined,
    page: page.value > 1 ? String(page.value) : undefined
  }
  router.replace({ query })
}

function load() {
  itemStore.fetchItems({
    search: q.search,
    status: props.filterByStatus || q.status,
    categoryId: q.category,
    intent: q.intent,
    sortBy: q.sort,
    sortOrder: q.dir,
    listedBefore: q.stale ? addDaysISO(-Number(q.stale)) : '',
    page: page.value,
    limit: 48
  })
}

// Debounce typing; filter changes apply immediately.
let searchTimer
watch(searchText, (v) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { q.search = v.trim() }, 300)
})

watch(() => ({ ...q }), () => {
  page.value = 1
  syncUrl()
  load()
}, { deep: true })

function changePage(p) {
  page.value = p
  syncUrl()
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Let real links (cmd-click etc.) do their thing; otherwise the whole row navigates.
function open(item, e) {
  if (e.target.closest('a')) return
  router.push(`/items/${item.id}`)
}

onMounted(() => {
  if (!categoryStore.categories.length) categoryStore.fetchCategories()
  load()
})
</script>

<style scoped>
.hide-sm { display: none; }
@media (min-width: 640px) { .hide-sm { display: inline; } }

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  align-items: center;
}
.search { position: relative; flex: 1 1 260px; min-width: 0; }
.search-icon { position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%); color: var(--text-faint); pointer-events: none; }
.search .form-input { padding-left: 2.1rem; }
.filter-toggle { flex: none; }
.filter-count {
  min-width: 1.15rem; height: 1.15rem; border-radius: 999px; padding: 0 0.3rem;
  background: var(--primary); color: #fff; font-size: 0.7rem;
  display: inline-flex; align-items: center; justify-content: center;
}
.filter-fields { display: none; width: 100%; gap: 0.5rem; grid-template-columns: 1fr 1fr; }
.filter-fields.open { display: grid; }
@media (min-width: 900px) {
  .filter-toggle { display: none; }
  .filter-fields { display: flex; width: auto; flex: 0 1 auto; }
  .filter-fields .form-input { width: auto; min-width: 9.5rem; }
}
.quick { display: flex; gap: 0.4rem; }
.chip { cursor: pointer; }
.chip.on { background: var(--warning-soft); border-color: var(--warning); color: var(--status-forsale-fg); }

.refreshing { opacity: 0.6; transition: opacity 0.15s; }

.items-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}
@media (min-width: 720px) { .items-grid { grid-template-columns: repeat(3, 1fr); gap: 1rem; } }
@media (min-width: 1100px) { .items-grid { grid-template-columns: repeat(4, 1fr); } }

.item-card { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.cover { aspect-ratio: 4 / 3; border-radius: 0; position: relative; }
.photo-count {
  position: absolute; right: 0.4rem; bottom: 0.4rem;
  background: rgba(0, 0, 0, 0.6); color: #fff;
  font-size: 0.7rem; padding: 0.15rem 0.4rem; border-radius: 999px;
  display: inline-flex; align-items: center; gap: 0.2rem;
}
.card-body { padding: 0.75rem 0.85rem 0.85rem; display: flex; flex-direction: column; gap: 0.3rem; flex: 1; }
.badges { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.name { font-size: 0.95rem; font-weight: 650; line-height: 1.25; overflow-wrap: anywhere; }
.meta { font-size: 0.8125rem; color: var(--text-muted); }
.tags { display: flex; flex-wrap: wrap; gap: 0.2rem 0.6rem; }
.tag { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.8125rem; color: var(--text-muted); white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.figures {
  margin-top: auto;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border);
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  font-size: 0.875rem;
  font-weight: 600;
}
.figures > div { display: flex; flex-direction: column; }
.figures .lbl { font-size: 0.6875rem; font-weight: 600; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em; }
@media (max-width: 480px) {
  .card-body { padding: 0.6rem 0.65rem 0.7rem; }
  .figures { gap: 0.5rem; font-size: 0.8125rem; }
}

.table-card { padding: 0.25rem 0.5rem; }
.thumb-col { width: 52px; padding-right: 0 !important; }
.small-thumb { width: 40px; height: 40px; }
.row-link { color: var(--text); font-weight: 600; text-decoration: none; }
.row-link:hover { color: var(--primary); }
.items-table td.stale { color: var(--warning); font-weight: 600; }
.hide-md { display: none; }
@media (min-width: 900px) { .hide-md { display: table-cell; } }
@media (max-width: 639px) { .items-table th.hide-sm, .items-table td.hide-sm { display: none; } }
@media (min-width: 640px) { .items-table th.hide-sm, .items-table td.hide-sm { display: table-cell; } }

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 1.5rem;
}
</style>
