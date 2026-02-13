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
          
          <!-- Expected Sales Section (Buy Bundles Only) -->
          <div v-if="bundle.type === 'buy'" class="detail-card card full-width">
            <h3>Expected Sales & Profit Estimation</h3>
            <div class="expected-sales-grid">
              <div v-for="item in bundle.items" :key="item.id" class="expected-item-card">
                <div class="expected-item-header">
                  <router-link :to="`/items/${item.id}`" class="expected-item-name">
                    {{ item.name }}
                  </router-link>
                  <span class="status-badge" :class="item.status">{{ item.status }}</span>
                </div>
                <div class="expected-item-details">
                  <div class="detail-row">
                    <span class="label">Cost:</span>
                    <span class="value">${{ stats.costPerItem.toFixed(2) }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Expected Sale:</span>
                    <input 
                      v-if="item.status === 'owned'"
                      type="number" 
                      step="0.01"
                      :value="item.expectedSalePrice"
                      @blur="updateExpectedPrice(item.id, $event.target.value)"
                      class="expected-price-input"
                      placeholder="0.00"
                    />
                    <span v-else class="value">
                      {{ item.salePrice ? `$${parseFloat(item.salePrice).toFixed(2)}` : '-' }}
                    </span>
                  </div>
                  <div v-if="item.expectedSalePrice || item.salePrice" class="detail-row profit-row">
                    <span class="label">Expected Profit:</span>
                    <span class="value" :class="calculateItemProfit(item) >= 0 ? 'profit-positive' : 'profit-negative'">
                      {{ formatProfit(calculateItemProfit(item)) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Total Expected Summary -->
            <div class="expected-summary">
              <h4>Total Expected Performance</h4>
              <div class="summary-stats">
                <div class="stat-item">
                  <span class="stat-label">Total Cost:</span>
                  <span class="stat-value">${{ parseFloat(bundle.purchasePrice || 0).toFixed(2) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Expected Revenue:</span>
                  <span class="stat-value">${{ calculateExpectedRevenue().toFixed(2) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Expected Profit:</span>
                  <span class="stat-value" :class="calculateExpectedProfit() >= 0 ? 'profit-positive' : 'profit-negative'">
                    {{ calculateExpectedProfit() >= 0 ? '+' : '' }}${{ calculateExpectedProfit().toFixed(2) }}
                  </span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Expected Margin:</span>
                  <span class="stat-value">{{ calculateExpectedMargin() }}%</span>
                </div>
              </div>
            </div>
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
import { useItemStore } from '@/stores/item'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const route = useRoute()
const bundleStore = useBundleStore()
const itemStore = useItemStore()

const bundle = ref(null)
const stats = ref(null)
const loading = ref(true)

const updateExpectedPrice = async (itemId, value) => {
  try {
    const expectedSalePrice = value ? parseFloat(value) : null
    await itemStore.updateItem(itemId, { expectedSalePrice })
    // Refresh bundle data
    bundle.value = await bundleStore.fetchBundle(route.params.id)
  } catch (error) {
    console.error('Error updating expected price:', error)
    alert('Failed to update expected price')
  }
}

const calculateExpectedRevenue = () => {
  if (!bundle.value?.items) return 0
  return bundle.value.items.reduce((sum, item) => {
    if (item.status === 'sold') {
      return sum + (parseFloat(item.salePrice) || 0)
    } else if (item.expectedSalePrice) {
      return sum + parseFloat(item.expectedSalePrice)
    }
    return sum
  }, 0)
}

const calculateExpectedProfit = () => {
  const revenue = calculateExpectedRevenue()
  const cost = parseFloat(bundle.value?.purchasePrice || 0)
  return revenue - cost
}

const calculateExpectedMargin = () => {
  const revenue = calculateExpectedRevenue()
  if (revenue === 0) return '0.0'
  const profit = calculateExpectedProfit()
  return ((profit / revenue) * 100).toFixed(1)
}

const calculateItemProfit = (item) => {
  if (!stats.value) return 0
  const costPerItem = stats.value.costPerItem
  if (item.status === 'sold') {
    return (parseFloat(item.salePrice) || 0) - costPerItem
  } else if (item.expectedSalePrice) {
    return parseFloat(item.expectedSalePrice) - costPerItem
  }
  return 0
}

const formatProfit = (profit) => {
  const sign = profit >= 0 ? '+' : ''
  return `${sign}$${profit.toFixed(2)}`
}

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

.expected-sales-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.expected-item-card {
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1rem;
}

.expected-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.expected-item-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-color);
  text-decoration: none;
}

.expected-item-name:hover {
  text-decoration: underline;
}

.expected-item-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-row .label {
  font-size: 0.875rem;
  color: #666;
}

.detail-row .value {
  font-weight: 600;
}

.expected-price-input {
  width: 100px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
  text-align: right;
}

.expected-price-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.profit-row {
  margin-top: 0.25rem;
  padding-top: 0.5rem;
  border-top: 1px solid #f0f0f0;
}

.profit-positive {
  color: #27ae60;
}

.profit-negative {
  color: #e74c3c;
}

.expected-summary {
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 1rem;
}

.expected-summary h4 {
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: white;
  border-radius: 6px;
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
}

@media (max-width: 768px) {
  .expected-sales-grid {
    grid-template-columns: 1fr;
  }
  
  .summary-stats {
    grid-template-columns: 1fr;
  }
}
</style>
