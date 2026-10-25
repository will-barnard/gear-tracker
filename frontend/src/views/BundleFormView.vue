<template>
  <div>
    <NavBar />
    <main class="page form-page">
      <router-link :to="cancelTo" class="back-link"><AppIcon name="arrow-left" :size="15" /> {{ isEdit ? 'Back to bundle' : 'Cancel' }}</router-link>
      <div class="page-header"><h2>{{ isEdit ? 'Edit bundle' : 'New bundle' }}</h2></div>

      <form @submit.prevent="handleSubmit" class="bundle-form">
        <section class="card">
          <div class="form-group">
            <label class="form-label">Type</label>
            <div class="type-pick">
              <button type="button" class="type-opt" :class="{ active: formData.type === 'buy' }" :disabled="lockType" @click="formData.type = 'buy'">
                <strong>Bought together</strong>
                <span>One price for several items. The cost is split across them.</span>
              </button>
              <button type="button" class="type-opt" :class="{ active: formData.type === 'sell' }" :disabled="lockType" @click="formData.type = 'sell'">
                <strong>Sold together</strong>
                <span>Several items going out for one price.</span>
              </button>
            </div>
            <small v-if="lockType" class="form-hint">The type can't change while the bundle has items.</small>
          </div>
          <div class="form-group">
            <label class="form-label">Name</label>
            <input v-model="formData.name" type="text" class="form-input" placeholder="e.g. Estate sale keys lot" required />
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea v-model="formData.description" class="form-input" rows="2"></textarea>
          </div>
        </section>

        <section v-if="formData.type === 'buy'" class="card">
          <h3>Purchase</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Price paid</label>
              <div class="input-prefix"><span>$</span><input v-model="formData.purchasePrice" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" /></div>
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input v-model="formData.purchaseDate" type="date" class="form-input" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Bought from</label>
            <input v-model="formData.purchaseLocation" type="text" class="form-input" />
          </div>
        </section>

        <section v-else class="card">
          <h3>Sale</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Sale price</label>
              <div class="input-prefix"><span>$</span><input v-model="formData.salePrice" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" /></div>
              <small class="form-hint">Leave empty while it's still listed.</small>
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input v-model="formData.saleDate" type="date" class="form-input" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fees</label>
              <div class="input-prefix"><span>$</span><input v-model="formData.saleFees" type="number" step="0.01" min="0" inputmode="decimal" class="form-input" /></div>
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
        </section>

        <section class="card">
          <h3>Status &amp; notes</h3>
          <div class="form-group">
            <div class="segmented">
              <button type="button" :class="{ active: formData.status === 'active' }" @click="formData.status = 'active'">Active</button>
              <button type="button" :class="{ active: formData.status === 'complete' }" @click="formData.status = 'complete'">Complete</button>
            </div>
            <small class="form-hint">Complete bundles drop out of the bundle pickers on the item form.</small>
          </div>
          <textarea v-model="formData.notes" class="form-input" rows="3" placeholder="Notes"></textarea>
        </section>

        <div v-if="error" class="alert alert-error">{{ error }}</div>

        <div class="form-actions">
          <router-link :to="cancelTo" class="btn btn-secondary">Cancel</router-link>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Saving…' : (isEdit ? 'Save changes' : 'Create bundle') }}
          </button>
        </div>
      </form>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBundleStore } from '@/stores/bundle'
import NavBar from '@/components/NavBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { errorMessage, PLATFORMS } from '@/utils/format'

const router = useRouter()
const route = useRoute()
const bundleStore = useBundleStore()

const isEdit = computed(() => route.name === 'EditBundle')
const cancelTo = computed(() => (isEdit.value ? `/bundles/${route.params.id}` : '/bundles'))
const lockType = ref(false)

const formData = ref({
  type: 'buy',
  name: '',
  description: '',
  status: 'active',
  purchasePrice: '',
  purchaseDate: '',
  purchaseLocation: '',
  salePrice: '',
  saleDate: '',
  saleLocation: '',
  saleFees: '',
  saleShipping: '',
  notes: ''
})

const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  try {
    const data = { ...formData.value }
    Object.keys(data).forEach((key) => { if (data[key] === '') data[key] = null })
    const saved = isEdit.value
      ? await bundleStore.updateBundle(route.params.id, data)
      : await bundleStore.createBundle(data)
    router.replace(`/bundles/${saved.id}`)
  } catch (err) {
    error.value = errorMessage(err, 'Failed to save bundle')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!isEdit.value) return
  try {
    const bundle = await bundleStore.fetchBundle(route.params.id)
    lockType.value = (bundle.items?.length || 0) > 0
    Object.keys(formData.value).forEach((key) => {
      if (bundle[key] !== null && bundle[key] !== undefined) formData.value[key] = bundle[key]
    })
  } catch (err) {
    error.value = errorMessage(err, "Couldn't load the bundle")
  }
})
</script>

<style scoped>
.form-page { max-width: 820px; }
.bundle-form { display: grid; gap: 1rem; }
.type-pick { display: grid; gap: 0.5rem; }
@media (min-width: 560px) { .type-pick { grid-template-columns: 1fr 1fr; } }
.type-opt {
  text-align: left; padding: 0.85rem 0.95rem; cursor: pointer;
  border: 1.5px solid var(--border-strong); border-radius: var(--radius);
  background: var(--surface); display: flex; flex-direction: column; gap: 0.25rem;
}
.type-opt span { font-size: 0.8125rem; color: var(--text-muted); }
.type-opt.active { border-color: var(--primary); background: var(--primary-soft); }
.type-opt.active strong { color: var(--primary-on-soft); }
.type-opt:disabled { cursor: not-allowed; opacity: 0.6; }
.type-opt.active:disabled { opacity: 1; }
.form-actions {
  display: flex; gap: 0.75rem; justify-content: flex-end;
  position: sticky; bottom: 0;
  padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom));
  background: linear-gradient(transparent, var(--bg) 30%);
}
@media (max-width: 640px) { .form-actions .btn { flex: 1; } }
</style>
