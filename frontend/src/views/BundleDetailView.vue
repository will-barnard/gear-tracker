<template>
  <div>
    <NavBar />
    <main class="page">
      <div v-if="loading" class="loading-block"><div class="spinner"></div>Loading…</div>

      <div v-else-if="!bundle" class="empty-state card">
        <p>That bundle doesn't exist (or was deleted).</p>
        <router-link to="/bundles" class="btn btn-secondary" style="margin-top: 1rem">Back to bundles</router-link>
      </div>

      <template v-else>
        <router-link to="/bundles" class="back-link"><AppIcon name="arrow-left" :size="15" /> Bundles</router-link>

        <header class="page-header">
          <div>
            <div class="badges">
              <span class="badge" :class="bundle.type">{{ bundle.type === 'buy' ? 'Buy bundle' : 'Sell bundle' }}</span>
              <span class="badge" :class="bundle.status">{{ bundle.status === 'complete' ? 'Complete' : 'Active' }}</span>
            </div>
            <h2 class="title">{{ bundle.name }}</h2>
            <p class="sub">
              <template v-if="bundle.type === 'buy'">{{ money(bundle.purchasePrice) }}<template v-if="bundle.purchaseDate"> · {{ date(bundle.purchaseDate) }}</template><template v-if="bundle.purchaseLocation"> · {{ bundle.purchaseLocation }}</template></template>
              <template v-else>{{ bundle.salePrice != null ? money(bundle.salePrice) : 'No price yet' }}<template v-if="bundle.saleDate"> · {{ date(bundle.saleDate) }}</template><template v-if="bundle.saleLocation"> · {{ bundle.saleLocation }}</template></template>
            </p>
          </div>
          <div class="page-actions">
            <button v-if="stats.isComplete && bundle.status !== 'complete'" class="btn btn-secondary" @click="setStatus('complete')">
              <AppIcon name="check" :size="15" /> Mark complete
            </button>
            <router-link :to="`/bundles/${bundle.id}/edit`" class="btn btn-primary"><AppIcon name="edit" :size="15" /> Edit</router-link>
            <button @click="handleDelete" class="btn btn-danger btn-icon" title="Delete bundle" aria-label="Delete bundle"><AppIcon name="trash" :size="16" /></button>
          </div>
        </header>

        <!-- Summary -->
        <div class="stats-grid">
          <template v-if="bundle.type === 'buy'">
            <div class="card stat-tile">
              <div class="label">Paid</div>
              <div class="value">{{ money(stats.purchasePrice, { whole: true }) }}</div>
              <div class="hint">{{ stats.totalItems }} item{{ stats.totalItems === 1 ? '' : 's' }}<template v-if="stats.totalAdditionalCosts"> · {{ signedMoney(stats.totalAdditionalCosts, { whole: true }) }} extra costs</template></div>
            </div>
            <div class="card stat-tile">
              <div class="label">Recovered</div>
              <div class="value">{{ money(stats.realizedRevenue, { whole: true }) }}</div>
              <div class="hint">{{ stats.soldItems }} of {{ stats.totalItems }} sold<template v-if="stats.recoveredPct != null"> · {{ stats.recoveredPct }}% of cost</template></div>
              <div class="meter" :title="`${stats.recoveredPct || 0}% of total cost recovered`"><div :style="{ width: Math.min(stats.recoveredPct || 0, 100) + '%' }"></div></div>
            </div>
            <div class="card stat-tile">
              <div class="label">Realized profit</div>
              <div class="value" :class="tone(stats.realizedProfit)">{{ signedMoney(stats.realizedProfit, { whole: true }) }}</div>
              <div class="hint">On items sold so far</div>
            </div>
            <div class="card stat-tile">
              <div class="label">Projected profit</div>
              <div class="value" :class="tone(stats.expectedProfit)">{{ signedMoney(stats.expectedProfit, { whole: true }) }}</div>
              <div class="hint">
                <template v-if="stats.expectedMargin != null">{{ stats.expectedMargin }}% margin</template>
                <template v-if="stats.unpricedItems"> · {{ stats.unpricedItems }} without a price</template>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="card stat-tile">
              <div class="label">Sale price</div>
              <div class="value">{{ money(stats.grossSale, { whole: true }) }}</div>
              <div class="hint">{{ stats.totalItems }} item{{ stats.totalItems === 1 ? '' : 's' }}</div>
            </div>
            <div class="card stat-tile">
              <div class="label">Fees &amp; shipping</div>
              <div class="value">{{ money(stats.saleFees, { whole: true }) }}</div>
              <div class="hint">Net {{ money(stats.netSale, { whole: true }) }}</div>
            </div>
            <div class="card stat-tile">
              <div class="label">Cost of items</div>
              <div class="value">{{ money(stats.totalCost, { whole: true }) }}</div>
              <div class="hint">Including extra costs</div>
            </div>
            <div class="card stat-tile">
              <div class="label">{{ stats.soldItems === stats.totalItems && stats.totalItems ? 'Profit' : 'Projected profit' }}</div>
              <div class="value" :class="tone(stats.profit)">{{ signedMoney(stats.profit, { whole: true }) }}</div>
              <div class="hint" v-if="stats.roi != null">{{ pct(stats.roi, { signed: true }) }} return</div>
            </div>
          </template>
        </div>

        <!-- Items -->
        <section class="card items-card">
          <div class="card-head">
            <h3>Items</h3>
            <router-link :to="`/items/new?bundle=${bundle.id}`" class="btn btn-secondary btn-sm"><AppIcon name="plus" :size="15" /> Add item</router-link>
          </div>

          <div v-if="bundle.type === 'buy' && bundle.items.length" class="split" :class="stats.allocation">
            <div class="split-text">
              <AppIcon :name="stats.allocation === 'partial' ? 'alert' : 'scale'" :size="16" />
              <span v-if="stats.allocation === 'weighted'"><strong>Cost split by value.</strong> Each item's share of the {{ money(stats.purchasePrice) }} follows its sale price.</span>
              <span v-else-if="stats.allocation === 'partial'"><strong>Split needs a rebalance.</strong> Only some items have a cost weight (one was added later, or had a price typed in), so the cost is split evenly for now.</span>
              <span v-else><strong>Even split</strong> — {{ money(stats.evenShare) }} each. Rebalance to weight by expected price.</span>
            </div>
            <div class="split-actions">
              <button class="btn btn-sm btn-secondary" @click="handleRebalance" :disabled="busy">{{ stats.allocation === 'weighted' ? 'Rebalance again' : 'Rebalance by value' }}</button>
              <button v-if="stats.allocation !== 'even'" class="btn btn-sm btn-ghost" @click="handleReset" :disabled="busy">Split evenly</button>
            </div>
          </div>

          <div v-if="bundle.items.length" class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="thumb-col"><span class="sr-only">Photo</span></th>
                  <th>Item</th>
                  <th class="r">Cost</th>
                  <th class="r">{{ bundle.type === 'buy' ? 'Sale / asking' : 'Share of sale' }}</th>
                  <th class="r">Profit</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in bundle.items" :key="item.id">
                  <td class="thumb-col">
                    <router-link :to="`/items/${item.id}`" class="thumb mini-thumb">
                      <img v-if="item.coverPhoto" :src="fileUrl(item.coverPhoto.thumb)" alt="" loading="lazy" />
                      <AppIcon v-else name="image" :size="16" />
                    </router-link>
                  </td>
                  <td>
                    <router-link :to="`/items/${item.id}`" class="row-link">{{ item.name }}</router-link>
                    <div><span class="badge" :class="item.status">{{ statusLabel(item.status) }}</span></div>
                  </td>
                  <td class="r money">
                    {{ money(item.costing.totalCost) }}
                    <div v-if="item.costing.adjustments" class="small faint">{{ money(item.costing.baseCost) }} {{ signedMoney(item.costing.adjustments) }}</div>
                  </td>
                  <td class="r money">
                    <template v-if="bundle.type === 'sell' || item.status === 'sold'">
                      {{ item.costing.grossSale != null ? money(item.costing.grossSale) : '—' }}
                    </template>
                    <div v-else class="input-prefix price-input">
                      <span>$</span>
                      <input
                        type="number" step="1" min="0" inputmode="decimal"
                        class="form-input"
                        :value="item.expectedSalePrice"
                        placeholder="Asking"
                        :aria-label="`Asking price for ${item.name}`"
                        @keydown.enter="$event.target.blur()"
                        @change="updateExpectedPrice(item, $event.target.value)"
                      />
                    </div>
                  </td>
                  <td class="r money" :class="tone(item.costing.profit)">
                    {{ item.costing.profit != null ? signedMoney(item.costing.profit) : '—' }}
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="bundle.type === 'buy'">
                <tr>
                  <td></td>
                  <td>Total</td>
                  <td class="r money">{{ money(stats.totalCost) }}</td>
                  <td class="r money">{{ money(stats.expectedRevenue) }}</td>
                  <td class="r money" :class="tone(stats.expectedProfit)">{{ signedMoney(stats.expectedProfit) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div v-else class="empty-state">
            <p>No items in this bundle yet.</p>
            <router-link :to="`/items/new?bundle=${bundle.id}`" class="btn btn-primary" style="margin-top: 0.75rem"><AppIcon name="plus" :size="15" /> Add the first item</router-link>
          </div>
          <p v-if="bundle.type === 'buy' && bundle.items.some(i => i.status !== 'sold')" class="form-hint">Asking prices save as you leave the field. Sale prices net of fees.</p>
        </section>

        <div class="lower" :class="{ 'with-notes': bundle.description || bundle.notes }">
          <AttachmentsPanel owner="bundle" :owner-id="bundle.id" :attachments="bundle.attachments" :wide="!(bundle.description || bundle.notes)" @change="bundle.attachments = $event" />

          <div v-if="bundle.description || bundle.notes" class="notes-col">
            <section v-if="bundle.description" class="card">
              <h3>Description</h3>
              <p class="prose">{{ bundle.description }}</p>
            </section>
            <section v-if="bundle.notes" class="card">
              <h3>Notes</h3>
              <p class="prose">{{ bundle.notes }}</p>
            </section>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBundleStore } from '@/stores/bundle'
import { useItemStore } from '@/stores/item'
import NavBar from '@/components/NavBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import AttachmentsPanel from '@/components/AttachmentsPanel.vue'
import { fileUrl } from '@/services/attachments'
import { money, signedMoney, pct, tone, date, statusLabel, errorMessage } from '@/utils/format'
import { confirmAction, toastError, toastSuccess } from '@/composables/useNotify'

const router = useRouter()
const route = useRoute()
const bundleStore = useBundleStore()
const itemStore = useItemStore()

const bundle = ref(null)
const loading = ref(true)
const busy = ref(false)
const stats = computed(() => bundle.value?.stats || {})

async function load() {
  loading.value = !bundle.value
  try {
    bundle.value = await bundleStore.fetchBundle(route.params.id)
  } catch (err) {
    bundle.value = null
    if (err.response?.status !== 404) toastError(errorMessage(err, "Couldn't load the bundle"))
  } finally {
    loading.value = false
  }
}

// Keep the attachments we already have when only numbers changed.
function apply(next) {
  bundle.value = { ...next, attachments: next.attachments ?? bundle.value?.attachments ?? [] }
}

async function handleRebalance() {
  busy.value = true
  try {
    apply(await bundleStore.rebalanceBundle(route.params.id))
    toastSuccess('Cost split by sale price')
  } catch (err) {
    toastError(errorMessage(err, 'Failed to rebalance bundle'))
  } finally {
    busy.value = false
  }
}

async function handleReset() {
  busy.value = true
  try {
    apply(await bundleStore.resetBalance(route.params.id))
  } catch (err) {
    toastError(errorMessage(err))
  } finally {
    busy.value = false
  }
}

async function updateExpectedPrice(item, value) {
  const expectedSalePrice = value === '' ? null : Number(value)
  if (expectedSalePrice === (item.expectedSalePrice == null ? null : Number(item.expectedSalePrice))) return
  try {
    await itemStore.updateItem(item.id, { expectedSalePrice })
    apply(await bundleStore.fetchBundle(route.params.id))
  } catch (err) {
    toastError(errorMessage(err, 'Failed to update asking price'))
  }
}

async function setStatus(status) {
  try {
    apply(await bundleStore.updateBundle(bundle.value.id, { status }))
  } catch (err) {
    toastError(errorMessage(err))
  }
}

async function handleDelete() {
  if (bundle.value.items.length) {
    toastError('Move or delete the items in this bundle first — a bundle with items can’t be deleted.')
    return
  }
  const ok = await confirmAction({ title: `Delete ${bundle.value.name}?`, message: 'Its photos and files are deleted too.', confirmLabel: 'Delete bundle', danger: true })
  if (!ok) return
  try {
    await bundleStore.deleteBundle(bundle.value.id)
    router.push('/bundles')
  } catch (err) {
    toastError(errorMessage(err, 'Failed to delete bundle'))
  }
}

watch(() => route.params.id, (id) => { if (id) { bundle.value = null; load() } }, { immediate: true })
</script>

<style scoped>
.badges { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.title { font-size: 1.6rem; margin-top: 0.4rem; overflow-wrap: anywhere; }
@media (min-width: 769px) { .title { font-size: 1.9rem; } }

.meter { height: 4px; border-radius: 2px; background: var(--surface-2); margin-top: 0.6rem; overflow: hidden; }
.meter > div { height: 100%; background: var(--success); }

.items-card { margin-top: 1.25rem; }
.split {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.7rem 0.85rem; margin-bottom: 1rem;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  font-size: 0.875rem;
}
.split.partial { background: var(--warning-soft); color: var(--status-forsale-fg); }
.split-text { display: flex; gap: 0.5rem; align-items: flex-start; flex: 1 1 280px; }
.split-text .icon { margin-top: 2px; }
.split-actions { display: flex; gap: 0.4rem; }

.thumb-col { width: 52px; padding-right: 0 !important; }
.mini-thumb { width: 40px; height: 40px; }
.row-link { color: var(--text); font-weight: 600; text-decoration: none; display: inline-block; margin-bottom: 0.2rem; }
.row-link:hover { color: var(--primary); }
.price-input { width: 7.5rem; margin-left: auto; }
.price-input .form-input { min-height: 34px; padding-top: 0.3rem; padding-bottom: 0.3rem; text-align: right; }

.lower { display: grid; gap: 1rem; margin-top: 1.25rem; }
.notes-col { display: grid; gap: 1rem; align-content: start; }
@media (min-width: 960px) { .lower.with-notes { grid-template-columns: minmax(0, 1.55fr) minmax(300px, 1fr); gap: 1.25rem; } }
.prose { white-space: pre-wrap; line-height: 1.55; }
</style>
