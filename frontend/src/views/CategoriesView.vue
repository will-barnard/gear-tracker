<template>
  <div>
    <NavBar />
    <main class="page">
      <div class="page-header">
        <div>
          <h2>Categories</h2>
          <p class="sub">How your gear is grouped. Click one to see its items.</p>
        </div>
        <button @click="openModal()" class="btn btn-primary"><AppIcon name="plus" :size="16" /> New category</button>
      </div>

      <div v-if="loading" class="loading-block"><div class="spinner"></div></div>

      <div v-else-if="!categories.length" class="empty-state card">
        <p>No categories yet. Make a few — Guitars, Keys, Amps, Pedals — to group your gear.</p>
      </div>

      <div v-else class="card table-card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th class="r">On hand</th>
                <th class="r hide-sm">Sold</th>
                <th class="r">Cost basis</th>
                <th class="r hide-sm">Profit</th>
                <th><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in rows" :key="c.id" class="clickable" @click="go(c, $event)">
                <td>
                  <div class="cat-name"><span class="cat-dot big-dot" :style="{ background: c.color }"></span>{{ c.name }}</div>
                  <div v-if="c.description" class="small faint desc">{{ c.description }}</div>
                </td>
                <td class="r num">{{ c.onHand }}</td>
                <td class="r num hide-sm">{{ c.sold }}</td>
                <td class="r money">{{ money(c.cost, { whole: true }) }}</td>
                <td class="r money hide-sm" :class="tone(c.profit)">{{ c.sold ? signedMoney(c.profit, { whole: true }) : '—' }}</td>
                <td class="r actions">
                  <button @click.stop="openModal(c)" class="btn btn-icon btn-sm btn-ghost" title="Edit"><AppIcon name="edit" :size="15" /></button>
                  <button @click.stop="remove(c)" class="btn btn-icon btn-sm btn-ghost" title="Delete"><AppIcon name="trash" :size="15" /></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <div v-if="modal" class="modal-overlay" @click.self="closeModal">
      <form class="modal" @submit.prevent="handleSubmit">
        <h3>{{ editing ? 'Edit category' : 'New category' }}</h3>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input v-model="formData.name" type="text" class="form-input" required autofocus />
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input v-model="formData.description" type="text" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <div class="swatches">
            <button
              v-for="c in SWATCHES" :key="c" type="button" class="swatch" :class="{ on: formData.color.toLowerCase() === c.toLowerCase() }"
              :style="{ background: c }" :aria-label="c" @click="formData.color = c"
            ></button>
            <input v-model="formData.color" type="color" class="color-input" aria-label="Custom color" />
          </div>
        </div>
        <div v-if="error" class="alert alert-error">{{ error }}</div>
        <div class="modal-actions">
          <button type="button" @click="closeModal" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/category'
import { useItemStore } from '@/stores/item'
import NavBar from '@/components/NavBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { money, signedMoney, tone, errorMessage } from '@/utils/format'
import { confirmAction, toastError } from '@/composables/useNotify'

const SWATCHES = ['#B45309', '#C2410C', '#B91C1C', '#BE185D', '#7C3AED', '#4338CA', '#1D4ED8', '#0E7490', '#047857', '#4D7C0F', '#57534E']

const router = useRouter()
const categoryStore = useCategoryStore()
const itemStore = useItemStore()
const categories = computed(() => categoryStore.categories)
const items = ref([])
const loading = ref(true)

// Uses the same server-computed costing as everywhere else (the old version
// summed raw purchase prices and added credits instead of subtracting them).
const rows = computed(() => categories.value.map((c) => {
  const mine = items.value.filter((i) => i.category?.id === c.id)
  const unsold = mine.filter((i) => i.status !== 'sold')
  const sold = mine.filter((i) => i.status === 'sold')
  return {
    ...c,
    onHand: unsold.length,
    sold: sold.length,
    cost: unsold.reduce((s, i) => s + i.effectiveCost, 0),
    profit: sold.reduce((s, i) => s + (i.profit || 0), 0)
  }
}))

function go(c, e) {
  if (e.target.closest('button')) return
  router.push({ path: '/items', query: { category: c.id } })
}

const modal = ref(false)
const editing = ref(null)
const formData = ref({ name: '', description: '', color: SWATCHES[0] })
const error = ref('')
const saving = ref(false)

function openModal(c = null) {
  editing.value = c
  formData.value = c
    ? { name: c.name, description: c.description || '', color: c.color || SWATCHES[0] }
    : { name: '', description: '', color: SWATCHES[categories.value.length % SWATCHES.length] }
  error.value = ''
  modal.value = true
}
function closeModal() { modal.value = false; editing.value = null }

async function handleSubmit() {
  error.value = ''
  saving.value = true
  try {
    if (editing.value) await categoryStore.updateCategory(editing.value.id, formData.value)
    else await categoryStore.createCategory(formData.value)
    closeModal()
  } catch (err) {
    error.value = errorMessage(err, 'Failed to save category')
  } finally {
    saving.value = false
  }
}

async function remove(c) {
  const row = rows.value.find((r) => r.id === c.id)
  const n = (row?.onHand || 0) + (row?.sold || 0)
  const ok = await confirmAction({
    title: `Delete ${c.name}?`,
    message: n ? `${n} item${n === 1 ? '' : 's'} will become uncategorized.` : '',
    confirmLabel: 'Delete',
    danger: true
  })
  if (!ok) return
  try {
    await categoryStore.deleteCategory(c.id)
    items.value = items.value.map((i) => (i.category?.id === c.id ? { ...i, category: null } : i))
  } catch (err) {
    toastError(errorMessage(err, 'Failed to delete category'))
  }
}

onMounted(async () => {
  try {
    const [, detail] = await Promise.all([categoryStore.fetchCategories(), itemStore.getStatsDetail()])
    items.value = detail.items
  } catch (err) {
    toastError(errorMessage(err, "Couldn't load categories"))
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.table-card { padding: 0.25rem 0.5rem; }
.cat-name { display: flex; align-items: center; gap: 0.6rem; font-weight: 600; }
.big-dot { width: 0.8rem; height: 0.8rem; }
.desc { margin-left: 1.4rem; }
.actions { white-space: nowrap; width: 1%; }
.hide-sm { display: none; }
@media (min-width: 640px) { .hide-sm { display: table-cell; } }
.swatches { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center; }
.swatch { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; }
.swatch.on { border-color: var(--surface); box-shadow: 0 0 0 2px var(--text); }
.color-input { width: 36px; height: 30px; border: 1px solid var(--border-strong); border-radius: 6px; background: var(--surface); padding: 1px; cursor: pointer; }
</style>
