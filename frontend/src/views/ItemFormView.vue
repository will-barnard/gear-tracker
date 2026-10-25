<template>
  <div>
    <NavBar />
    <main class="page form-page">
      <router-link :to="cancelTo" class="back-link"><AppIcon name="arrow-left" :size="15" /> {{ isEdit ? 'Back to item' : 'Cancel' }}</router-link>
      <div class="page-header">
        <h2>{{ isEdit ? 'Edit item' : 'Add item' }}</h2>
      </div>

      <div v-if="loadingItem" class="loading-block"><div class="spinner"></div></div>

      <form v-else @submit.prevent="handleSubmit" class="item-form">
        <!-- Basics -->
        <section class="card">
          <h3>The gear</h3>
          <div class="form-group">
            <label class="form-label" for="f-name">Name</label>
            <input id="f-name" v-model="formData.name" type="text" class="form-input" placeholder="e.g. 1974 Fender Rhodes Mark I" required autofocus />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Brand</label>
              <input v-model="formData.brand" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Model</label>
              <input v-model="formData.model" type="text" class="form-input" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select v-model="formData.categoryId" class="form-input">
                <option value="">None</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Why you have it</label>
              <div class="segmented intent">
                <button type="button" :class="{ active: formData.intent === 'flip' }" @click="formData.intent = 'flip'">Flip</button>
                <button type="button" :class="{ active: formData.intent === 'keep' }" @click="formData.intent = 'keep'">Keeper</button>
              </div>
              <small class="form-hint">{{ formData.intent === 'keep' ? 'Part of the collection — tracked by estimated value.' : 'Bought to resell.' }}</small>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Serial number</label>
              <input v-model="formData.serialNumber" type="text" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">Condition</label>
              <input v-model="formData.condition" type="text" class="form-input" list="conditions" placeholder="Excellent, Good, Needs work…" />
              <datalist id="conditions"><option>Mint</option><option>Excellent</option><option>Very good</option><option>Good</option><option>Fair</option><option>Needs work</option><option>For parts</option></datalist>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea v-model="formData.description" class="form-input" rows="3"></textarea>
          </div>
        </section>

        <!-- Photos -->
        <section v-if="isEdit && editingItem" class="photos-wrap">
          <AttachmentsPanel owner="item" :owner-id="editingItem.id" :attachments="editingItem.attachments || []" />
        </section>
        <section v-else class="card">
          <div class="card-head">
            <h3>Photos &amp; files</h3>
            <div class="page-actions">
              <button type="button" class="btn btn-secondary btn-sm" @click="photoPicker.click()"><AppIcon name="camera" :size="15" /> Photos</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="filePicker.click()"><AppIcon name="paperclip" :size="15" /> Files</button>
            </div>
            <input ref="photoPicker" type="file" accept="image/*" multiple hidden @change="queueFiles($event, 'photo')" />
            <input ref="filePicker" type="file" multiple hidden @change="queueFiles($event, 'document')" />
          </div>
          <div v-if="pendingFiles.length" class="pending-grid">
            <div v-for="(f, i) in pendingFiles" :key="f.key" class="pending-file" :class="{ failed: f.error }">
              <img v-if="f.preview" :src="f.preview" alt="" />
              <span v-else class="pf-icon"><AppIcon name="file" :size="20" /></span>
              <span class="pf-name">{{ f.file.name }}</span>
              <div v-if="f.progress > 0 && !f.error" class="progress"><div :style="{ width: Math.round(f.progress * 100) + '%' }"></div></div>
              <button v-if="!loading" type="button" class="pf-remove" @click="unqueue(i)" aria-label="Remove"><AppIcon name="x" :size="13" /></button>
            </div>
          </div>
          <p v-else class="small muted">Add photos now or later from the item page. They upload after the item is saved.</p>
        </section>

        <!-- Purchase -->
        <section class="card">
          <h3>Purchase</h3>
          <div class="form-group">
            <label class="form-label">Bought in a bundle?</label>
            <select v-model="formData.purchaseBundleId" class="form-input">
              <option value="">No — bought on its own</option>
              <option v-for="bundle in buyBundles" :key="bundle.id" :value="bundle.id">{{ bundle.name }}{{ bundle.status === 'complete' ? ' (complete)' : '' }}</option>
            </select>
          </div>
          <template v-if="!purchaseBundle">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Purchase price</label>
                <div class="input-prefix"><span>$</span><input v-model="formData.purchasePrice" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" /></div>
              </div>
              <div class="form-group">
                <label class="form-label">Purchase date</label>
                <input v-model="formData.purchaseDate" type="date" class="form-input" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Bought from</label>
              <input v-model="formData.purchaseLocation" type="text" class="form-input" placeholder="Seller, store, marketplace…" />
            </div>
          </template>
          <p v-else class="alert alert-info">
            Cost and date come from the <strong>{{ purchaseBundle.name }}</strong> bundle ({{ money(purchaseBundle.purchasePrice) }}<template v-if="purchaseBundle.purchaseDate">, {{ date(purchaseBundle.purchaseDate) }}</template>).
          </p>
        </section>

        <!-- Status & sale -->
        <section class="card">
          <h3>Status</h3>
          <div class="form-group">
            <div class="segmented status-seg">
              <button type="button" :class="{ active: formData.status === 'owned' }" @click="formData.status = 'owned'">Owned</button>
              <button type="button" :class="{ active: formData.status === 'for_sale' }" @click="formData.status = 'for_sale'">For sale</button>
              <button type="button" :class="{ active: formData.status === 'sold' }" @click="formData.status = 'sold'">Sold</button>
            </div>
            <small v-if="isEdit && originalStatus !== 'owned' && formData.status === 'owned'" class="form-hint">Sale and listing details will be cleared.</small>
          </div>

          <div class="form-row" id="value">
            <div class="form-group">
              <label class="form-label">{{ formData.status === 'sold' ? 'Asking price (was)' : 'Asking / expected price' }}</label>
              <div class="input-prefix"><span>$</span><input v-model="formData.expectedSalePrice" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" /></div>
              <small class="form-hint">Used for projected profit and for rebalancing bundle costs.</small>
            </div>
            <div v-if="formData.status !== 'sold'" class="form-group">
              <label class="form-label">Estimated value</label>
              <div class="input-prefix"><span>$</span><input v-model="formData.estimatedValue" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" /></div>
              <small class="form-hint">What it'd fetch today. Counts toward collection value.</small>
            </div>
          </div>

          <template v-if="formData.status !== 'owned'">
            <div class="form-group">
              <label class="form-label">{{ formData.status === 'sold' ? 'Sold in a bundle?' : 'Selling as part of a bundle?' }}</label>
              <select v-model="formData.saleBundleId" class="form-input">
                <option value="">No — on its own</option>
                <option v-for="bundle in sellBundles" :key="bundle.id" :value="bundle.id">{{ bundle.name }}{{ bundle.status === 'complete' ? ' (complete)' : '' }}</option>
              </select>
            </div>
          </template>

          <template v-if="formData.status === 'for_sale'">
            <h4 class="sub-h">Listing</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Where</label>
                <select v-model="formData.listingPlatform" class="form-input">
                  <option value="">—</option>
                  <option v-for="p in PLATFORMS" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Listed on</label>
                <input v-model="formData.listedAt" type="date" class="form-input" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Listing link</label>
              <input v-model="formData.listingUrl" type="url" class="form-input" placeholder="https://reverb.com/item/…" @change="onListingUrl" />
            </div>
            <label class="check"><input v-model="formData.isListedOnline" type="checkbox" /> Live right now</label>
          </template>

          <template v-if="formData.status === 'sold' && !saleBundle">
            <h4 class="sub-h">Sale</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Sale price</label>
                <div class="input-prefix"><span>$</span><input v-model="formData.salePrice" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" /></div>
              </div>
              <div class="form-group">
                <label class="form-label">Sale date</label>
                <input v-model="formData.saleDate" type="date" class="form-input" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Fees</label>
                <div class="input-prefix"><span>$</span><input v-model="formData.saleFees" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" /></div>
                <small class="form-hint">Marketplace + payment processing.</small>
              </div>
              <div class="form-group">
                <label class="form-label">Shipping you paid</label>
                <div class="input-prefix"><span>$</span><input v-model="formData.saleShipping" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" /></div>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Sold on / to</label>
              <input v-model="formData.saleLocation" type="text" class="form-input" list="platforms" />
              <datalist id="platforms"><option v-for="p in PLATFORMS" :key="p">{{ p }}</option></datalist>
            </div>
            <p v-if="netPreview != null" class="small muted">Net after fees: <strong class="money">{{ money(netPreview) }}</strong></p>
          </template>
          <p v-else-if="saleBundle" class="alert alert-info">
            Sale price, fees and date come from the <strong>{{ saleBundle.name }}</strong> bundle.
          </p>
        </section>

        <section class="card">
          <h3>Notes</h3>
          <textarea v-model="formData.notes" class="form-input" rows="3" placeholder="Anything worth remembering — history, repairs, who's interested…"></textarea>
        </section>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <div class="form-actions">
          <router-link :to="cancelTo" class="btn btn-secondary">Cancel</router-link>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? (uploading ? 'Uploading photos…' : 'Saving…') : (isEdit ? 'Save changes' : 'Add item') }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useItemStore } from '@/stores/item'
import { useCategoryStore } from '@/stores/category'
import { useBundleStore } from '@/stores/bundle'
import NavBar from '@/components/NavBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import AttachmentsPanel from '@/components/AttachmentsPanel.vue'
import { uploadAttachment } from '@/services/attachments'
import { isImage } from '@/utils/imageResize'
import { money, date, errorMessage, todayISO, PLATFORMS } from '@/utils/format'
import { toastError } from '@/composables/useNotify'

const router = useRouter()
const route = useRoute()
const itemStore = useItemStore()
const categoryStore = useCategoryStore()
const bundleStore = useBundleStore()

const isEdit = computed(() => route.name === 'EditItem')

const formData = ref({
  name: '',
  brand: '',
  model: '',
  categoryId: '',
  intent: 'flip',
  purchaseBundleId: '',
  saleBundleId: '',
  status: 'owned',
  description: '',
  purchasePrice: '',
  purchaseDate: '',
  purchaseLocation: '',
  salePrice: '',
  saleDate: '',
  saleLocation: '',
  saleFees: '',
  saleShipping: '',
  expectedSalePrice: '',
  estimatedValue: '',
  isListedOnline: false,
  listingPlatform: '',
  listingUrl: '',
  listedAt: '',
  serialNumber: '',
  condition: '',
  notes: ''
})

const categories = computed(() => categoryStore.categories)
const bundles = ref([])
const editingItem = ref(null)
const originalStatus = ref(null)
const error = ref('')
const loading = ref(false)
const uploading = ref(false)
const loadingItem = ref(false)

// Active bundles, plus whichever bundle this item is already in even if it's
// marked complete — otherwise the select shows "none" and saving could drop it.
const visibleBundles = (type, currentId) =>
  bundles.value.filter((b) => b.type === type && (b.status === 'active' || b.id === currentId))
const buyBundles = computed(() => visibleBundles('buy', formData.value.purchaseBundleId))
const sellBundles = computed(() => visibleBundles('sell', formData.value.saleBundleId))
const purchaseBundle = computed(() => bundles.value.find((b) => b.id === formData.value.purchaseBundleId) || null)
const saleBundle = computed(() => bundles.value.find((b) => b.id === formData.value.saleBundleId) || null)

const netPreview = computed(() => {
  const sale = Number(formData.value.salePrice)
  if (!sale) return null
  return sale - Number(formData.value.saleFees || 0) - Number(formData.value.saleShipping || 0)
})

const cancelTo = computed(() => {
  if (isEdit.value) return `/items/${route.params.id}`
  if (route.query.bundle) return `/bundles/${route.query.bundle}`
  return window.history.state?.back || '/items'
})

function onListingUrl() {
  if (formData.value.listingUrl) {
    formData.value.isListedOnline = true
    if (!formData.value.listingPlatform) {
      const u = formData.value.listingUrl.toLowerCase()
      formData.value.listingPlatform = u.includes('reverb.com') ? 'Reverb'
        : u.includes('ebay.') ? 'eBay'
        : u.includes('facebook.com') ? 'Facebook Marketplace'
        : u.includes('craigslist.') ? 'Craigslist' : ''
    }
    if (!formData.value.listedAt) formData.value.listedAt = todayISO()
  }
}

// ── files picked before the item exists ─────────────────
const photoPicker = ref(null)
const filePicker = ref(null)
const pendingFiles = ref([])
let fileKey = 0
function queueFiles(e, kind) {
  for (const file of e.target.files || []) {
    const isPhoto = kind === 'photo' && isImage(file)
    pendingFiles.value.push({
      key: ++fileKey,
      file,
      kind: isPhoto ? 'photo' : 'document',
      preview: isPhoto && /^image\/(jpeg|png|webp|gif)$/.test(file.type) ? URL.createObjectURL(file) : null,
      progress: 0,
      error: null
    })
  }
  e.target.value = ''
}
function unqueue(i) {
  const [f] = pendingFiles.value.splice(i, 1)
  if (f?.preview) URL.revokeObjectURL(f.preview)
}
onBeforeUnmount(() => pendingFiles.value.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)))

async function uploadPending(itemId) {
  uploading.value = true
  let failed = 0
  for (const f of pendingFiles.value) {
    try {
      await uploadAttachment('item', itemId, f.file, { kind: f.kind, onProgress: (p) => { f.progress = p } })
    } catch (err) {
      f.error = errorMessage(err)
      failed++
    }
  }
  uploading.value = false
  if (failed) toastError(`${failed} file${failed === 1 ? '' : 's'} didn't upload — you can add ${failed === 1 ? 'it' : 'them'} again from the item page.`)
}

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  try {
    const data = { ...formData.value }
    Object.keys(data).forEach((key) => { if (data[key] === '') data[key] = null })
    // Fields that don't apply to the chosen status aren't sent; the server
    // clears them on a status change anyway.
    if (data.status === 'owned') data.saleBundleId = null
    if (data.purchaseBundleId) {
      delete data.purchasePrice
      delete data.purchaseDate
    }
    if (data.saleBundleId) {
      delete data.salePrice
      delete data.saleDate
      delete data.saleFees
      delete data.saleShipping
    }

    const saved = isEdit.value
      ? await itemStore.updateItem(route.params.id, data)
      : await itemStore.createItem(data)

    if (!isEdit.value && pendingFiles.value.length) await uploadPending(saved.id)
    router.replace(`/items/${saved.id}`)
  } catch (err) {
    error.value = errorMessage(err, 'Failed to save item')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  loadingItem.value = isEdit.value
  try {
    const [, allBundles] = await Promise.all([
      categoryStore.categories.length ? null : categoryStore.fetchCategories(),
      bundleStore.fetchBundles()
    ])
    bundles.value = allBundles || []

    if (isEdit.value) {
      const item = await itemStore.fetchItem(route.params.id)
      editingItem.value = item
      originalStatus.value = item.status
      Object.keys(formData.value).forEach((key) => {
        if (item[key] !== null && item[key] !== undefined) formData.value[key] = item[key]
      })
    } else {
      // Arriving from a bundle's "Add item" button.
      const b = bundles.value.find((x) => x.id === route.query.bundle)
      if (b?.type === 'buy') formData.value.purchaseBundleId = b.id
      if (b?.type === 'sell') {
        formData.value.saleBundleId = b.id
        formData.value.status = 'for_sale'
      }
    }
  } catch (err) {
    error.value = errorMessage(err, "Couldn't load the form")
  } finally {
    loadingItem.value = false
  }
  if (route.hash === '#value') {
    await nextTick()
    document.getElementById('value')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
})
</script>

<style scoped>
.form-page { max-width: 820px; }
.item-form { display: grid; gap: 1rem; }
.sub-h { font-size: 0.8125rem; font-weight: 650; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 1.25rem 0 0.75rem; }
.segmented.intent, .segmented.status-seg { display: flex; }
.segmented.intent button, .segmented.status-seg button { flex: 1; justify-content: center; min-height: 36px; }
.form-actions {
  display: flex; gap: 0.75rem; justify-content: flex-end;
  position: sticky; bottom: 0;
  padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom));
  background: linear-gradient(transparent, var(--bg) 30%);
}
@media (max-width: 640px) { .form-actions .btn { flex: 1; } }

.pending-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 0.5rem; }
.pending-file {
  position: relative; aspect-ratio: 1; border-radius: var(--radius-sm); overflow: hidden;
  background: var(--surface-2); display: flex; flex-direction: column; align-items: center; justify-content: center;
}
.pending-file img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.pending-file.failed { outline: 2px solid var(--danger-strong); }
.pf-icon { color: var(--text-faint); }
.pf-name {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 0.4rem 0.35rem 0.25rem;
  font-size: 0.6875rem; color: #fff; background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pending-file:not(:has(img)) .pf-name { color: var(--text-muted); background: none; }
.pf-remove {
  position: absolute; top: 0.25rem; right: 0.25rem; width: 24px; height: 24px; border-radius: 6px;
  border: 0; background: rgba(0, 0, 0, 0.6); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.progress { position: absolute; left: 0.4rem; right: 0.4rem; top: 50%; height: 4px; background: rgba(255, 255, 255, 0.5); border-radius: 2px; overflow: hidden; }
.progress > div { height: 100%; background: var(--primary); }
</style>
