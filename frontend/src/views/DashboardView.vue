<template>
  <div>
    <NavBar />
    <main class="page">
      <div class="page-header">
        <div>
          <h2>Dashboard</h2>
          <p class="sub" v-if="!loading">{{ totalCount }} item{{ totalCount === 1 ? '' : 's' }} tracked</p>
        </div>
      </div>

      <div v-if="loading" class="loading-block"><div class="spinner"></div>Loading…</div>

      <template v-else>
        <div v-if="!totalCount" class="empty-state card">
          <AppIcon name="package" :size="32" class="icon" />
          <p>Nothing tracked yet. Add your first piece of gear — just a name is enough to start.</p>
          <router-link to="/items/new" class="btn btn-primary" style="margin-top: 1rem"><AppIcon name="plus" :size="16" /> Add item</router-link>
        </div>

        <template v-else>
          <!-- Profit headline -->
          <router-link to="/stats/profit" class="card card-link headline">
            <div>
              <div class="label">Profit from sales</div>
              <div class="big money" :class="tone(sold.totalProfit)">{{ signedMoney(sold.totalProfit || 0) }}</div>
              <div class="hint">
                {{ sold.count || 0 }} sold · {{ money(sold.totalSalePrice || 0, { whole: true }) }} net revenue
                <template v-if="sold.totalFees"> after {{ money(sold.totalFees, { whole: true }) }} fees</template>
              </div>
            </div>
            <div class="headline-side" v-if="sold.pricedCost">
              <div class="label">Return on cost</div>
              <div class="mid money" :class="tone(sold.totalProfit)">{{ pct(sold.totalProfit / sold.pricedCost, { signed: true }) }}</div>
            </div>
          </router-link>

          <h3 class="section-title">Inventory</h3>
          <div class="stats-grid">
            <router-link to="/stats/inventory" class="card card-link stat-tile">
              <div class="label">On hand</div>
              <div class="value">{{ (owned.count || 0) + (forSale.count || 0) }}</div>
              <div class="hint">{{ owned.count || 0 }} owned · {{ forSale.count || 0 }} for sale</div>
            </router-link>
            <router-link to="/stats/collection-value" class="card card-link stat-tile">
              <div class="label">Cost basis</div>
              <div class="value">{{ money((owned.totalInvestment || 0) + (forSale.totalInvestment || 0), { whole: true }) }}</div>
              <div class="hint">What you have in everything unsold</div>
            </router-link>
            <router-link to="/stats/collection-value" class="card card-link stat-tile">
              <div class="label">Estimated value</div>
              <div class="value">{{ money((owned.currentValue || 0) + (forSale.currentValue || 0), { whole: true }) }}</div>
              <div class="hint">
                {{ (owned.estimatedCount || 0) + (forSale.estimatedCount || 0) }} of {{ (owned.count || 0) + (forSale.count || 0) }} with an estimate; rest at cost
              </div>
            </router-link>
            <router-link to="/items?intent=keep" class="card card-link stat-tile">
              <div class="label">Keepers</div>
              <div class="value">{{ keepers.count }}</div>
              <div class="hint">
                <template v-if="keepers.count">{{ money(keepers.value, { whole: true }) }} value · {{ money(keepers.cost, { whole: true }) }} cost</template>
                <template v-else>Mark gear you're keeping as a Keeper</template>
              </div>
            </router-link>
          </div>

          <h3 class="section-title">For sale</h3>
          <div class="stats-grid">
            <router-link to="/for-sale" class="card card-link stat-tile">
              <div class="label">Items for sale</div>
              <div class="value">{{ forSale.count || 0 }}</div>
              <div class="hint">{{ money(forSale.totalInvestment || 0, { whole: true }) }} cost basis</div>
            </router-link>
            <router-link to="/stats/listings" class="card card-link stat-tile">
              <div class="label">Listed</div>
              <div class="value">{{ forSale.listedOnlineCount || 0 }}</div>
              <div class="hint">{{ (forSale.count || 0) - (forSale.listedOnlineCount || 0) }} not listed yet</div>
            </router-link>
            <router-link to="/for-sale?stale=60" class="card card-link stat-tile" :class="{ warn: staleListings }">
              <div class="label">Listed 60+ days</div>
              <div class="value">{{ staleListings }}</div>
              <div class="hint">{{ staleListings ? 'Worth a price drop?' : 'Nothing stale' }}</div>
            </router-link>
            <router-link to="/stats/projected-profit" class="card card-link stat-tile">
              <div class="label">Projected profit</div>
              <div class="value" :class="tone(forSale.totalProfit)">{{ signedMoney(forSale.totalProfit || 0, { whole: true }) }}</div>
              <div class="hint">
                {{ forSale.pricedCount || 0 }} of {{ forSale.count || 0 }} priced · {{ money(forSale.totalSalePrice || 0, { whole: true }) }} asking
              </div>
            </router-link>
          </div>

          <div class="card-head recent-head">
            <div class="section-title" style="margin: 0">Recent activity</div>
            <router-link to="/items" class="small">All items</router-link>
          </div>
          <div class="recent">
            <router-link v-for="item in recent" :key="item.id" :to="`/items/${item.id}`" class="recent-item card card-link">
              <div class="thumb rthumb">
                <img v-if="item.coverPhoto" :src="fileUrl(item.coverPhoto.thumb)" alt="" loading="lazy" />
                <AppIcon v-else name="image" :size="18" />
              </div>
              <div class="r-main">
                <div class="r-name">{{ item.name }}</div>
                <div class="small faint">
                  <span class="badge" :class="item.status">{{ statusLabel(item.status) }}</span>
                  {{ date(item.costing.saleDate || item.costing.purchaseDate || item.createdAt, { short: true }) }}
                </div>
              </div>
              <div class="r-fig money" :class="item.costing.saleKind === 'sold' ? tone(item.costing.profit) : ''">
                {{ item.costing.saleKind === 'sold' ? signedMoney(item.costing.profit, { whole: true }) : money(item.costing.totalCost, { whole: true }) }}
              </div>
            </router-link>
          </div>
        </template>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import api from '@/services/api'
import { useItemStore } from '@/stores/item'
import { fileUrl } from '@/services/attachments'
import { money, signedMoney, pct, tone, date, statusLabel, errorMessage } from '@/utils/format'
import { toastError } from '@/composables/useNotify'

const itemStore = useItemStore()

const loading = ref(true)
const summary = ref({ stats: [], keepers: { count: 0, cost: 0, value: 0 }, staleListings: 0 })
const recent = ref([])

const byStatus = (s) => computed(() => summary.value.stats.find((x) => x.status === s) || {})
const owned = byStatus('owned')
const forSale = byStatus('for_sale')
const sold = byStatus('sold')
const keepers = computed(() => summary.value.keepers || { count: 0, cost: 0, value: 0 })
const staleListings = computed(() => summary.value.staleListings || 0)
const totalCount = computed(() => summary.value.stats.reduce((n, s) => n + s.count, 0))

onMounted(async () => {
  try {
    const [s, r] = await Promise.all([
      itemStore.getStats(),
      api.get('/items', { params: { sortBy: 'updatedAt', sortOrder: 'DESC', limit: 6 } })
    ])
    summary.value = s
    recent.value = r.data.items
  } catch (err) {
    toastError(errorMessage(err, "Couldn't load the dashboard"))
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.headline {
  display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; flex-wrap: wrap;
  padding: 1.25rem 1.35rem;
}
.headline .label { font-size: 0.875rem; color: var(--text-muted); }
.headline .big { font-size: 2.25rem; font-weight: 750; letter-spacing: -0.03em; margin-top: 0.2rem; }
.headline .mid { font-size: 1.5rem; font-weight: 700; margin-top: 0.2rem; }
.headline .hint { font-size: 0.8125rem; color: var(--text-faint); margin-top: 0.2rem; }
.headline-side { text-align: right; }
@media (min-width: 769px) { .headline .big { font-size: 2.75rem; } }

.stat-tile.warn { border-color: color-mix(in srgb, var(--warning) 45%, var(--border)); }
.stat-tile.warn .value { color: var(--warning); }

.recent-head { margin: 2rem 0 0.75rem; }
.recent { display: grid; gap: 0.5rem; }
@media (min-width: 720px) { .recent { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .recent { grid-template-columns: repeat(3, 1fr); } }
.recent-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; }
.rthumb { width: 44px; height: 44px; }
.r-main { flex: 1; min-width: 0; }
.r-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.r-main .small { display: flex; align-items: center; gap: 0.4rem; margin-top: 0.15rem; }
.r-fig { font-weight: 650; white-space: nowrap; }
</style>
