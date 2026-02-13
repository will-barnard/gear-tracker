<template>
  <div class="bundles-view">
    <NavBar />
    
    <div class="container">
      <div class="bundles-header">
        <h2>Bundles</h2>
        <router-link to="/bundles/new" class="btn btn-primary">Add Bundle</router-link>
      </div>
      
      <div v-if="bundleStore.loading" class="loading">Loading...</div>
      
      <div v-else-if="bundles.length === 0" class="empty-state card">
        <p>No bundles yet. Create your first bundle to track bulk purchases!</p>
      </div>
      
      <div v-else class="bundles-grid">
        <div v-for="bundle in bundles" :key="bundle.id" class="bundle-card card">
          <div class="bundle-header">
            <h3>{{ bundle.name }}</h3>
            <div class="badges">
              <span class="type-badge" :class="bundle.type">{{ bundle.type === 'buy' ? 'Buy' : 'Sell' }}</span>
              <span class="status-badge" :class="bundle.status">{{ bundle.status }}</span>
            </div>
          </div>
          
          <div class="bundle-details">
            <p v-if="bundle.type === 'buy' && bundle.purchasePrice">
              <strong>Purchase Price:</strong> ${{ parseFloat(bundle.purchasePrice).toFixed(2) }}
            </p>
            <p v-if="bundle.type === 'buy' && bundle.purchaseDate">
              <strong>Purchase Date:</strong> {{ new Date(bundle.purchaseDate).toLocaleDateString() }}
            </p>
            <p v-if="bundle.type === 'sell' && bundle.salePrice">
              <strong>Sale Price:</strong> ${{ parseFloat(bundle.salePrice).toFixed(2) }}
            </p>
            <p v-if="bundle.type === 'sell' && bundle.saleDate">
              <strong>Sale Date:</strong> {{ new Date(bundle.saleDate).toLocaleDateString() }}
            </p>
            <p>
              <strong>Items:</strong> {{ bundle.items?.length || 0 }}
            </p>
            <p v-if="bundle.items?.length">
              <strong>Owned:</strong> {{ bundle.items.filter(i => i.status === 'owned').length }} | 
              <strong>Sold:</strong> {{ bundle.items.filter(i => i.status === 'sold').length }}
            </p>
          </div>
          
          <div class="bundle-actions">
            <router-link :to="`/bundles/${bundle.id}`" class="btn btn-secondary">View</router-link>
            <router-link :to="`/bundles/${bundle.id}/edit`" class="btn btn-primary">Edit</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useBundleStore } from '@/stores/bundle'
import NavBar from '@/components/NavBar.vue'

const bundleStore = useBundleStore()
const bundles = ref([])

onMounted(async () => {
  bundles.value = await bundleStore.fetchBundles()
})
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

@media (min-width: 769px) {
  .container {
    padding: 2rem;
  }
}

.bundles-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.bundles-header h2 {
  font-size: 1.5rem;
}

@media (min-width: 769px) {
  .bundles-header {
    margin-bottom: 2rem;
  }
}

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.empty-state {
  text-align: center;
  padding: 3rem 1.5rem;
  color: var(--text-secondary);
}

.bundles-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .bundles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .bundles-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.bundle-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bundle-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 0.5rem;
}

.bundle-header h3 {
  flex: 1;
  margin: 0;
  font-size: 1.125rem;
  word-break: break-word;
}

.badges {
  display: flex;
  gap: 0.25rem;
  flex-direction: column;
}

.type-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  white-space: nowrap;
}

.type-badge.buy {
  background: #FEF3C7;
  color: #92400E;
}

.type-badge.sell {
  background: #E0E7FF;
  color: #3730A3;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  white-space: nowrap;
}

.status-badge.active {
  background: #DBEAFE;
  color: #1E40AF;
}

.status-badge.complete {
  background: #D1FAE5;
  color: #065F46;
}

.bundle-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.bundle-details p {
  margin: 0;
}

.bundle-actions {
  display: flex;
  gap: 0.5rem;
}

.bundle-actions .btn {
  flex: 1;
  text-align: center;
  text-decoration: none;
}
</style>
