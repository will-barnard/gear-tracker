<template>
  <div class="bundle-detail-view">
    <NavBar />
    
    <div class="container">
      <div v-if="loading" class="loading">Loading...</div>
      
      <div v-else-if="bundle">
        <div class="detail-header">
          <div>
            <h2>{{ bundle.name }}</h2>
            <div class="badges">
              <span class="type-badge" :class="bundle.type">{{ bundle.type === 'buy' ? 'Buy Bundle' : 'Sell Bundle' }}</span>
              <span class="status-badge" :class="bundle.status">{{ bundle.status }}</span>
            </div>
          </div>
          <div class="header-actions">
            <router-link :to="`/bundles/${bundle.id}/edit`" class="btn btn-primary">Edit</router-link>
            <button @click="handleDelete" class="btn btn-danger">Delete</button>
          </div>
        </div>
        
        <div class="detail-grid">
          <div class="detail-card card" v-if="bundle.type === 'buy'">
            <h3>Purchase Information</h3>
            <dl>
              <dt>Purchase Price</dt>
              <dd>${{ bundle.purchasePrice ? parseFloat(bundle.purchasePrice).toFixed(2) : '0.00' }}</dd>
              
              <dt>Purchase Date</dt>
              <dd>{{ bundle.purchaseDate ? new Date(bundle.purchaseDate).toLocaleDateString() : 'Not set' }}</dd>
              
              <dt>Purchase Location</dt>
              <dd>{{ bundle.purchaseLocation || 'Not set' }}</dd>
            </dl>
          </div>
          
          <div class="detail-card card" v-if="bundle.type === 'sell'">
            <h3>Sale Information</h3>
            <dl>
              <dt>Sale Price</dt>
              <dd>${{ bundle.salePrice ? parseFloat(bundle.salePrice).toFixed(2) : '0.00' }}</dd>
              
              <dt>Sale Date</dt>
              <dd>{{ bundle.saleDate ? new Date(bundle.saleDate).toLocaleDateString() : 'Not set' }}</dd>
              
              <dt>Sale Location</dt>
              <dd>{{ bundle.saleLocation || 'Not set' }}</dd>
            </dl>
          </div>
          
          <div class="detail-card card" v-if="stats">
            <h3>Statistics</h3>
            <dl>
              <dt>Total Items</dt>
              <dd>{{ stats.totalItems }}</dd>
              
              <dt>Owned</dt>
              <dd>{{ stats.ownedItems }}</dd>
              
              <dt>Sold</dt>
              <dd>{{ stats.soldItems }}</dd>
              
              <template v-if="bundle.type === 'buy'">
                <dt>Cost Per Item</dt>
                <dd>${{ stats.costPerItem.toFixed(2) }}</dd>
                
                <dt>Total Revenue</dt>
                <dd>${{ stats.totalRevenue.toFixed(2) }}</dd>
              </template>
              
              <template v-if="bundle.type === 'sell'">
                <dt>Total Item Cost</dt>
                <dd>${{ stats.totalCost.toFixed(2) }}</dd>
                
                <dt>Bundle Sale Price</dt>
                <dd>${{ stats.totalRevenue.toFixed(2) }}</dd>
              </template>
              
              <dt>Total Profit</dt>
              <dd :class="stats.totalProfit >= 0 ? 'profit' : 'loss'">
                {{ stats.totalProfit >= 0 ? '+' : '' }}${{ stats.totalProfit.toFixed(2) }}
              </dd>
            </dl>
          </div>
          
          <div v-if="bundle.description" class="detail-card card full-width">
            <h3>Description</h3>
            <p>{{ bundle.description }}</p>
          </div>
          
          <div v-if="bundle.notes" class="detail-card card full-width">
            <h3>Notes</h3>
            <p>{{ bundle.notes }}</p>
          </div>
          
          <div class="detail-card card full-width">
            <div class="items-header">
              <h3>Items in Bundle</h3>
              <router-link to="/items/new" class="btn btn-primary btn-sm">Add Item</router-link>
            </div>
            
            <div v-if="bundle.items && bundle.items.length > 0" class="items-grid">
              <div v-for="item in bundle.items" :key="item.id" class="item-card">
                <div class="item-info">
                  <router-link :to="`/items/${item.id}`" class="item-name">
                    {{ item.name }}
                  </router-link>
                  <span class="status-badge" :class="item.status">{{ item.status }}</span>
                </div>
                <div class="item-details">
                  <span v-if="item.salePrice" class="sale-price">
                    Sale: ${{ parseFloat(item.salePrice).toFixed(2) }}
                  </span>
                  <span v-if="stats" class="cost-share">
                    <template v-if="bundle.type === 'buy'">
                      Cost: ${{ stats.costPerItem.toFixed(2) }}
                    </template>
                    <template v-else-if="item.purchasePrice">
                      Cost: ${{ parseFloat(item.purchasePrice).toFixed(2) }}
                    </template>
                  </span>
                </div>
              </div>
            </div>
            
            <div v-else class="empty-message">
              <p>No items in this bundle yet. Add items from the item form to associate them with this bundle.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBundleStore } from '@/stores/bundle'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const route = useRoute()
const bundleStore = useBundleStore()

const bundle = ref(null)
const stats = ref(null)
const loading = ref(true)

const handleDelete = async () => {
  if (confirm('Are you sure you want to delete this bundle? You can only delete bundles with no items.')) {
    try {
      await bundleStore.deleteBundle(bundle.value.id)
      router.push('/bundles')
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete bundle')
    }
  }
}

onMounted(async () => {
  try {
    bundle.value = await bundleStore.fetchBundle(route.params.id)
    stats.value = await bundleStore.getBundleStats(route.params.id)
  } finally {
    loading.value = false
  }
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

.loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-direction: column;
}

@media (min-width: 640px) {
  .detail-header {
    flex-direction: row;
    margin-bottom: 2rem;
  }
}

.detail-header h2 {
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
  word-break: break-word;
}

.badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.type-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.type-badge.buy {
  background: #FEF3C7;
  color: #92400E;
}

.type-badge.sell {
  background: #E0E7FF;
  color: #3730A3;
}

@media (min-width: 769px) {
  .detail-header h2 {
    font-size: 1.75rem;
  }
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.active {
  background: #DBEAFE;
  color: #1E40AF;
}

.status-badge.complete {
  background: #D1FAE5;
  color: #065F46;
}

.status-badge.owned {
  background: #DBEAFE;
  color: #1E40AF;
}

.status-badge.sold {
  background: #D1FAE5;
  color: #065F46;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

@media (min-width: 640px) {
  .header-actions {
    width: auto;
  }
}

.header-actions .btn {
  text-decoration: none;
  flex: 1;
}

@media (min-width: 640px) {
  .header-actions .btn {
    flex: initial;
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .detail-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1.5rem;
  }
}

.detail-card h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.detail-card.full-width {
  grid-column: 1 / -1;
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem 1rem;
}

dt {
  font-weight: 500;
  color: var(--text-secondary);
}

dd {
  color: var(--text-primary);
}

.profit {
  color: var(--success-color);
  font-weight: 600;
}

.loss {
  color: var(--danger-color);
  font-weight: 600;
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.items-grid {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.item-card {
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.item-name {
  font-weight: 500;
  color: var(--primary-color);
  text-decoration: none;
}

.item-name:hover {
  text-decoration: underline;
}

.item-details {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.empty-message {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
  font-style: italic;
}
</style>
