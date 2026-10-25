<template>
  <div>
    <NavBar />
    <main class="page">
      <div v-if="loading" class="loading-block"><div class="spinner"></div>Loading…</div>

      <div v-else-if="!item" class="empty-state card">
        <p>That item doesn't exist (or was deleted).</p>
        <router-link to="/items" class="btn btn-secondary" style="margin-top: 1rem">Back to items</router-link>
      </div>

      <template v-else>
        <router-link :to="backTo.path" class="back-link"><AppIcon name="arrow-left" :size="15" /> {{ backTo.label }}</router-link>

        <header class="page-header detail-header">
          <div class="title-block">
            <div class="badges">
              <span class="badge" :class="item.status">{{ statusLabel(item.status) }}</span>
              <span v-if="item.intent === 'keep'" class="badge keep">Keeper</span>
              <span v-if="item.status === 'for_sale' && item.isListedOnline" class="badge active">Listed{{ item.listingPlatform ? ` on ${item.listingPlatform}` : '' }}</span>
            </div>
            <h2>{{ item.name }}</h2>
            <p v-if="item.brand || item.model" class="sub">{{ [item.brand, item.model].filter(Boolean).join(' · ') }}</p>
          </div>
          <div class="page-actions">
            <router-link :to="`/items/${item.id}/edit`" class="btn btn-primary"><AppIcon name="edit" :size="15" /> Edit</router-link>
            <button @click="handleDelete" class="btn btn-danger btn-icon" title="Delete item" aria-label="Delete item"><AppIcon name="trash" :size="16" /></button>
          </div>
        </header>

        <!-- Bundle links: the way back to the lot this came from / went out with -->
        <div v-if="item.purchaseBundle || item.saleBundle" class="bundle-links">
          <router-link v-if="item.purchaseBundle" :to="`/bundles/${item.purchaseBundle.id}`" class="bundle-link card card-link">
            <span class="bl-icon"><AppIcon name="package" :size="18" /></span>
            <span class="bl-text">
              <span class="bl-label">Bought in bundle</span>
              <span class="bl-name">{{ item.purchaseBundle.name }}</span>
            </span>
            <span class="bl-meta small muted">{{ money(item.purchaseBundle.purchasePrice) }} lot<template v-if="item.purchaseBundle.purchaseDate"> · {{ date(item.purchaseBundle.purchaseDate) }}</template></span>
            <AppIcon name="chevron-right" :size="18" class="bl-arrow" />
          </router-link>
          <router-link v-if="item.saleBundle" :to="`/bundles/${item.saleBundle.id}`" class="bundle-link card card-link">
            <span class="bl-icon"><AppIcon name="package" :size="18" /></span>
            <span class="bl-text">
              <span class="bl-label">Sold in bundle</span>
              <span class="bl-name">{{ item.saleBundle.name }}</span>
            </span>
            <span class="bl-meta small muted">{{ money(item.saleBundle.salePrice) }}<template v-if="item.saleBundle.saleDate"> · {{ date(item.saleBundle.saleDate) }}</template></span>
            <AppIcon name="chevron-right" :size="18" class="bl-arrow" />
          </router-link>
        </div>

        <div class="layout">
          <div class="main-col">
            <AttachmentsPanel owner="item" :owner-id="item.id" :attachments="item.attachments" show="photos" @change="item.attachments = $event" />

            <section class="card">
              <h3>Details</h3>
              <dl class="dl">
                <dt>Category</dt>
                <dd>
                  <span v-if="item.category" class="inline-tag"><span class="cat-dot" :style="{ background: item.category.color }"></span>{{ item.category.name }}</span>
                  <span v-else class="faint">—</span>
                </dd>
                <template v-if="item.serialNumber"><dt>Serial</dt><dd class="mono">{{ item.serialNumber }}</dd></template>
                <template v-if="item.condition"><dt>Condition</dt><dd>{{ item.condition }}</dd></template>
                <dt>Purchased</dt>
                <dd>
                  {{ date(item.costing.purchaseDate) }}
                  <span v-if="purchaseLocation" class="muted"> · {{ purchaseLocation }}</span>
                </dd>
                <template v-if="item.status === 'sold'">
                  <dt>Sold</dt>
                  <dd>
                    {{ date(item.costing.saleDate) }}
                    <span v-if="saleLocation" class="muted"> · {{ saleLocation }}</span>
                  </dd>
                </template>
                <template v-if="item.costing.daysHeld != null">
                  <dt>{{ item.status === 'sold' ? 'Held for' : 'Owned for' }}</dt>
                  <dd>{{ days(item.costing.daysHeld) }}</dd>
                </template>
              </dl>
            </section>

            <section v-if="item.description" class="card">
              <h3>Description</h3>
              <p class="prose">{{ item.description }}</p>
            </section>

            <section v-if="item.notes" class="card">
              <h3>Notes</h3>
              <p class="prose">{{ item.notes }}</p>
            </section>
          </div>

          <aside class="side-col">
            <!-- Money -->
            <section class="card money-card">
              <h3>Numbers</h3>
              <dl class="dl money-dl">
                <dt>{{ costLabel }}</dt>
                <dd class="money r">{{ money(item.costing.baseCost) }}</dd>
                <template v-if="item.costing.adjustments">
                  <dt>Additional costs</dt>
                  <dd class="money r">{{ signedMoney(item.costing.adjustments) }}</dd>
                </template>
                <dt class="total">Total cost</dt>
                <dd class="money r total">{{ money(item.costing.totalCost) }}</dd>

                <template v-if="item.costing.saleKind">
                  <hr />
                  <dt>{{ item.costing.saleKind === 'sold' ? (item.costing.saleSource === 'bundle' ? 'Share of bundle sale' : 'Sale price') : (item.costing.saleSource === 'bundle' ? 'Share of bundle ask' : 'Asking price') }}</dt>
                  <dd class="money r">{{ money(item.costing.grossSale) }}</dd>
                  <template v-if="item.costing.saleFees">
                    <dt>Fees &amp; shipping</dt>
                    <dd class="money r">−{{ money(item.costing.saleFees) }}</dd>
                  </template>
                  <dt class="total">{{ item.costing.saleKind === 'sold' ? 'Profit' : 'Projected profit' }}</dt>
                  <dd class="money r total" :class="tone(item.costing.profit)">{{ signedMoney(item.costing.profit) }}</dd>
                  <template v-if="item.costing.roi != null">
                    <dt>Return</dt>
                    <dd class="money r" :class="tone(item.costing.roi)">{{ pct(item.costing.roi, { signed: true }) }}</dd>
                  </template>
                </template>

                <template v-if="item.status !== 'sold' && (item.estimatedValue || item.intent === 'keep')">
                  <hr />
                  <dt>Estimated value</dt>
                  <dd class="money r">
                    <template v-if="item.estimatedValue">{{ money(item.estimatedValue) }}</template>
                    <router-link v-else :to="`/items/${item.id}/edit#value`" class="small">Add estimate</router-link>
                  </dd>
                  <template v-if="item.estimatedValue">
                    <dt>Unrealized</dt>
                    <dd class="money r" :class="tone(item.estimatedValue - item.costing.totalCost)">{{ signedMoney(item.estimatedValue - item.costing.totalCost) }}</dd>
                  </template>
                </template>
              </dl>
              <p v-if="item.costing.costSource !== 'item'" class="form-hint cost-note">
                <template v-if="item.costing.costSource === 'bundle-weighted'">Weighted share of the {{ money(item.purchaseBundle?.purchasePrice) }} bundle, by sale price.</template>
                <template v-else>Even share of the {{ money(item.purchaseBundle?.purchasePrice) }} bundle.<template v-if="item.costing.allocation === 'partial'"> Some items in the bundle have weights and some don't — rebalance the bundle to split by value.</template></template>
              </p>
            </section>

            <!-- Listing -->
            <section v-if="item.status === 'for_sale'" class="card">
              <h3>Listing</h3>
              <dl class="dl">
                <dt>Status</dt>
                <dd>{{ item.isListedOnline ? 'Listed' : 'Not listed yet' }}</dd>
                <template v-if="item.listingPlatform"><dt>Where</dt><dd>{{ item.listingPlatform }}</dd></template>
                <template v-if="item.listedAt">
                  <dt>Since</dt>
                  <dd>{{ date(item.listedAt) }} <span class="muted" :class="{ stale: item.costing.daysListed >= 60 }">({{ days(item.costing.daysListed) }})</span></dd>
                </template>
              </dl>
              <a v-if="item.listingUrl" :href="item.listingUrl" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="margin-top: 1rem">
                View listing <AppIcon name="external" :size="15" />
              </a>
            </section>

            <!-- Additional costs -->
            <section class="card">
              <div class="card-head">
                <h3>Additional costs</h3>
                <button @click="openCost()" class="btn btn-secondary btn-sm"><AppIcon name="plus" :size="15" /> Add</button>
              </div>
              <ul v-if="item.additionalCosts?.length" class="cost-list">
                <li v-for="cost in item.additionalCosts" :key="cost.id" class="cost">
                  <div class="cost-main">
                    <span class="cost-desc">{{ cost.description }}</span>
                    <span class="small faint">{{ date(cost.date) }}<template v-if="cost.category"> · {{ cost.category }}</template></span>
                  </div>
                  <span class="money cost-amt" :class="cost.type === 'income' ? 'positive' : ''">
                    {{ cost.type === 'income' ? '−' : '' }}{{ money(cost.amount) }}
                  </span>
                  <span class="cost-actions">
                    <button @click="openCost(cost)" class="btn btn-icon btn-sm btn-ghost" title="Edit"><AppIcon name="edit" :size="14" /></button>
                    <button @click="deleteCost(cost)" class="btn btn-icon btn-sm btn-ghost" title="Delete"><AppIcon name="trash" :size="14" /></button>
                  </span>
                </li>
                <li class="cost cost-total">
                  <span class="cost-main">Net</span>
                  <span class="money cost-amt">{{ signedMoney(item.costing.adjustments) }}</span>
                  <span class="cost-actions"></span>
                </li>
              </ul>
              <p v-else class="small muted">Repairs, parts, shipping in — anything that adds to what this cost you. Credits (like selling a replaced part) subtract.</p>
            </section>

            <AttachmentsPanel owner="item" :owner-id="item.id" :attachments="item.attachments" show="documents" @change="item.attachments = $event" />
          </aside>
        </div>
      </template>
    </main>

    <!-- Add/Edit Cost Modal -->
    <div v-if="costModal" class="modal-overlay" @click.self="closeCostModal">
      <form class="modal" @submit.prevent="saveCost">
        <h3>{{ editingCost ? 'Edit cost' : 'Add cost' }}</h3>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input v-model="costForm.description" type="text" class="form-input" placeholder="e.g. New tines, shipping in" required />
        </div>
        <div class="form-group">
          <div class="segmented" role="radiogroup">
            <button type="button" :class="{ active: costForm.type === 'expense' }" @click="costForm.type = 'expense'">Expense</button>
            <button type="button" :class="{ active: costForm.type === 'income' }" @click="costForm.type = 'income'">Credit / income</button>
          </div>
          <small class="form-hint">Expenses add to cost; credits offset it (e.g. selling a replaced part).</small>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Amount</label>
            <div class="input-prefix"><span>$</span><input v-model="costForm.amount" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" required /></div>
          </div>
          <div class="form-group">
            <label class="form-label">Date</label>
            <input v-model="costForm.date" type="date" class="form-input" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <input v-model="costForm.category" type="text" class="form-input" list="cost-cats" placeholder="Repair, Parts, Shipping…" />
          <datalist id="cost-cats"><option>Repair</option><option>Parts</option><option>Shipping</option><option>Cleaning</option><option>Case</option></datalist>
        </div>
        <div v-if="costError" class="alert alert-error">{{ costError }}</div>
        <div class="modal-actions">
          <button type="button" @click="closeCostModal" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="savingCost">{{ savingCost ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useItemStore } from '@/stores/item'
import NavBar from '@/components/NavBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import AttachmentsPanel from '@/components/AttachmentsPanel.vue'
import api from '@/services/api'
import { money, signedMoney, pct, tone, date, days, statusLabel, todayISO, errorMessage } from '@/utils/format'
import { confirmAction, toastError, toastSuccess } from '@/composables/useNotify'

const router = useRouter()
const route = useRoute()
const itemStore = useItemStore()

const item = ref(null)
const loading = ref(true)

// Came from a bundle page? Go back there.
const backTo = computed(() => {
  const back = window.history.state?.back
  if (back && back.startsWith('/bundles/')) return { path: back, label: 'Bundle' }
  if (back && back.startsWith('/for-sale')) return { path: back, label: 'For sale' }
  if (back && back.startsWith('/items') && !back.includes('/edit') && back !== '/items/new') return { path: back, label: 'Items' }
  return { path: '/items', label: 'Items' }
})

const costLabel = computed(() => {
  if (!item.value) return ''
  if (item.value.costing.costSource === 'bundle-weighted') return 'Bundle share (weighted)'
  if (item.value.costing.costSource === 'bundle-even') return 'Bundle share (even)'
  return 'Purchase price'
})
const purchaseLocation = computed(() => item.value?.purchaseLocation || item.value?.purchaseBundle?.purchaseLocation)
const saleLocation = computed(() => item.value?.saleLocation || item.value?.saleBundle?.saleLocation)

async function load() {
  loading.value = true
  try {
    item.value = await itemStore.fetchItem(route.params.id)
  } catch (err) {
    item.value = null
    if (err.response?.status !== 404) toastError(errorMessage(err, "Couldn't load the item"))
  } finally {
    loading.value = false
  }
}

const handleDelete = async () => {
  const files = item.value.attachments?.length || 0
  const ok = await confirmAction({
    title: `Delete ${item.value.name}?`,
    message: `This removes the item, its costs${files ? ` and ${files} attached file${files === 1 ? '' : 's'}` : ''}. It can't be undone.`,
    confirmLabel: 'Delete item',
    danger: true
  })
  if (!ok) return
  try {
    await itemStore.deleteItem(item.value.id)
    toastSuccess('Item deleted')
    router.push(backTo.value.path.startsWith('/bundles/') ? backTo.value.path : '/items')
  } catch (err) {
    toastError(errorMessage(err, "Couldn't delete the item"))
  }
}

// ── costs ────────────────────────────────────────────────
const costModal = ref(false)
const editingCost = ref(null)
const blankCost = () => ({ date: todayISO(), description: '', type: 'expense', category: '', amount: '' })
const costForm = ref(blankCost())
const costError = ref('')
const savingCost = ref(false)

function openCost(cost = null) {
  editingCost.value = cost
  costForm.value = cost
    ? { date: cost.date, description: cost.description, type: cost.type || 'expense', category: cost.category || '', amount: cost.amount }
    : blankCost()
  costError.value = ''
  costModal.value = true
}

function closeCostModal() {
  costModal.value = false
  editingCost.value = null
}

async function saveCost() {
  costError.value = ''
  savingCost.value = true
  try {
    const data = { ...costForm.value, itemId: item.value.id, amount: Number(costForm.value.amount), category: costForm.value.category || null }
    if (editingCost.value) await api.put(`/costs/${editingCost.value.id}`, data)
    else await api.post('/costs', data)
    const attachments = item.value.attachments
    item.value = { ...(await itemStore.fetchItem(route.params.id)), attachments }
    closeCostModal()
  } catch (err) {
    costError.value = errorMessage(err, 'Failed to save cost')
  } finally {
    savingCost.value = false
  }
}

async function deleteCost(cost) {
  const ok = await confirmAction({ title: `Delete “${cost.description}”?`, confirmLabel: 'Delete', danger: true })
  if (!ok) return
  try {
    await api.delete(`/costs/${cost.id}`)
    item.value = await itemStore.fetchItem(route.params.id)
  } catch (err) {
    toastError(errorMessage(err, 'Failed to delete cost'))
  }
}

watch(() => route.params.id, (id) => { if (id) load() }, { immediate: true })
</script>

<style scoped>
.detail-header { margin-bottom: 1rem; }
.title-block h2 { font-size: 1.6rem; margin-top: 0.4rem; overflow-wrap: anywhere; }
.title-block .badges { display: flex; gap: 0.3rem; flex-wrap: wrap; }
@media (min-width: 769px) { .title-block h2 { font-size: 1.9rem; } }

.bundle-links { display: grid; gap: 0.5rem; margin-bottom: 1.25rem; }
@media (min-width: 720px) { .bundle-links { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); } }
.bundle-link {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
  background: color-mix(in srgb, var(--primary-soft) 45%, var(--surface));
}
.bl-icon {
  width: 36px; height: 36px; border-radius: 8px; flex: none;
  display: flex; align-items: center; justify-content: center;
  background: var(--primary-soft); color: var(--primary-on-soft);
}
.bl-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.bl-label { font-size: 0.6875rem; font-weight: 650; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-faint); }
.bl-name { font-weight: 650; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bl-meta { white-space: nowrap; }
.bl-arrow { color: var(--text-faint); }
.bundle-link:hover .bl-name { color: var(--primary); }
@media (max-width: 480px) { .bl-meta { display: none; } }

.layout { display: grid; gap: 1rem; }
.main-col, .side-col { display: grid; gap: 1rem; align-content: start; min-width: 0; }
@media (min-width: 960px) {
  .layout { grid-template-columns: minmax(0, 1.55fr) minmax(320px, 1fr); gap: 1.25rem; }
  .main-col, .side-col { gap: 1.25rem; }
}

.money-dl { grid-template-columns: 1fr auto; }
.money-dl .r { text-align: right; }
.cost-note { margin-top: 0.85rem; }
.stale { color: var(--warning); font-weight: 600; }
.inline-tag { display: inline-flex; align-items: center; gap: 0.4rem; }
.mono { font-family: var(--font-mono); font-size: 0.85rem; }
.prose { white-space: pre-wrap; line-height: 1.55; }

.cost-list { display: flex; flex-direction: column; }
.cost { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0; border-top: 1px solid var(--border); }
.cost:first-child { border-top: 0; padding-top: 0; }
.cost-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.cost-desc { font-weight: 550; overflow-wrap: anywhere; }
.cost-amt { font-weight: 600; white-space: nowrap; }
.cost-actions { display: flex; width: 64px; justify-content: flex-end; }
.cost-total { font-weight: 650; border-top: 1px solid var(--border-strong); }
</style>
