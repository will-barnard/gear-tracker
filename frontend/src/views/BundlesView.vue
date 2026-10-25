<template>
  <div>
    <NavBar />
    <main class="page">
      <div class="page-header">
        <div>
          <h2>Bundles</h2>
          <p class="sub">Lots you bought together, or sold together.</p>
        </div>
        <div class="page-actions">
          <div class="segmented" role="group" aria-label="Show">
            <button :class="{ active: show === 'active' }" @click="show = 'active'">Active</button>
            <button :class="{ active: show === 'complete' }" @click="show = 'complete'">Complete</button>
            <button :class="{ active: show === 'all' }" @click="show = 'all'">All</button>
          </div>
          <router-link to="/bundles/new" class="btn btn-primary"><AppIcon name="plus" :size="16" /> New bundle</router-link>
        </div>
      </div>

      <div v-if="bundleStore.loading && !bundles.length" class="loading-block"><div class="spinner"></div></div>

      <div v-else-if="!visible.length" class="empty-state card">
        <AppIcon name="package" :size="32" class="icon" />
        <p v-if="bundles.length">No {{ show }} bundles.</p>
        <p v-else>No bundles yet. Make one when you buy a lot of gear for one price — the cost gets split across the items.</p>
      </div>

      <div v-else class="bundles-grid">
        <router-link v-for="bundle in visible" :key="bundle.id" :to="`/bundles/${bundle.id}`" class="bundle-card card card-link">
          <div class="cover thumb">
            <img v-if="bundle.coverPhoto" :src="fileUrl(bundle.coverPhoto.thumb)" :alt="bundle.name" loading="lazy" />
            <AppIcon v-else name="package" :size="26" />
          </div>
          <div class="body">
            <div class="badges">
              <span class="badge" :class="bundle.type">{{ bundle.type === 'buy' ? 'Buy' : 'Sell' }}</span>
              <span class="badge" :class="bundle.status">{{ bundle.status === 'complete' ? 'Complete' : 'Active' }}</span>
              <span v-if="bundle.allocation === 'partial'" class="badge warn" title="Some items have cost weights and some don't">Rebalance</span>
            </div>
            <h3>{{ bundle.name }}</h3>
            <p class="meta">
              <span class="money">{{ money(bundle.type === 'buy' ? bundle.purchasePrice : bundle.salePrice, { whole: true }) }}</span>
              <span v-if="bundle.type === 'buy' ? bundle.purchaseDate : bundle.saleDate"> · {{ date(bundle.type === 'buy' ? bundle.purchaseDate : bundle.saleDate) }}</span>
            </p>
            <div class="progress-row">
              <span class="small muted">{{ soldCount(bundle) }} of {{ bundle.items?.length || 0 }} sold</span>
              <div class="meter"><div :style="{ width: pctSold(bundle) + '%' }"></div></div>
            </div>
          </div>
        </router-link>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBundleStore } from '@/stores/bundle'
import NavBar from '@/components/NavBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import { fileUrl } from '@/services/attachments'
import { money, date, errorMessage } from '@/utils/format'
import { toastError } from '@/composables/useNotify'

const bundleStore = useBundleStore()
const bundles = computed(() => bundleStore.bundles)
const show = ref('active')
const visible = computed(() => show.value === 'all' ? bundles.value : bundles.value.filter((b) => b.status === show.value))

const soldCount = (b) => (b.items || []).filter((i) => i.status === 'sold').length
const pctSold = (b) => (b.items?.length ? Math.round((soldCount(b) / b.items.length) * 100) : 0)

onMounted(async () => {
  try {
    await bundleStore.fetchBundles()
  } catch (err) {
    toastError(errorMessage(err, "Couldn't load bundles"))
  }
})
</script>

<style scoped>
.bundles-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
@media (min-width: 640px) { .bundles-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; } }
@media (min-width: 1024px) { .bundles-grid { grid-template-columns: repeat(3, 1fr); } }
.bundle-card { padding: 0; overflow: hidden; display: flex; }
.cover { width: 112px; min-height: 112px; border-radius: 0; flex: none; }
.body { padding: 0.8rem 0.9rem; display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; flex: 1; }
.badges { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.body h3 { font-size: 0.975rem; font-weight: 650; overflow-wrap: anywhere; }
.meta { font-size: 0.875rem; color: var(--text-muted); }
.progress-row { margin-top: auto; padding-top: 0.25rem; }
.meter { height: 4px; border-radius: 2px; background: var(--surface-2); margin-top: 0.3rem; overflow: hidden; }
.meter > div { height: 100%; background: var(--success); }
</style>
