<template>
  <div class="dashboard">
    <NavBar />
    
    <div class="container">
      <div class="dashboard-header">
        <h2>Dashboard</h2>
        <router-link to="/items/new" class="btn btn-primary">Quick Add Item</router-link>
      </div>
      
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
      
      <div v-else class="stats-grid">
        <div class="stat-card card">
          <h3>Owned Items</h3>
          <p class="stat-value">{{ ownedCount }}</p>
          <p class="stat-label">Current inventory</p>
        </div>
        
        <div class="stat-card card">
          <h3>Total Investment</h3>
          <p class="stat-value">${{ totalInvestment.toFixed(2) }}</p>
          <p class="stat-label">Purchase + costs</p>
        </div>
        
        <div class="stat-card card">
          <h3>Items Sold</h3>
          <p class="stat-value">{{ soldCount }}</p>
          <p class="stat-label">Completed sales</p>
        </div>
        
        <div class="stat-card card">
          <h3>Total Revenue</h3>
          <p class="stat-value">${{ totalRevenue.toFixed(2) }}</p>
          <p class="stat-label">From sales</p>
        </div>
      </div>
      
      <div v-if="!loading" class="profit-card card">
        <h3>Total Profit/Loss</h3>
        <p class="profit-value" :class="profit >= 0 ? 'positive' : 'negative'">
          {{ profit >= 0 ? '+' : '' }}${{ profit.toFixed(2) }}
        </p>
      </div>
      
      <div v-if="!loading" class="for-sale-section">
        <h3 class="section-title">For Sale Inventory</h3>
        <div class="stats-grid">
          <div class="stat-card card">
            <h3>Items for Sale</h3>
            <p class="stat-value">{{ forSaleCount }}</p>
            <p class="stat-label">Marked for sale</p>
          </div>
          
          <div class="stat-card card">
            <h3>Investment Value</h3>
            <p class="stat-value">${{ forSaleInvestment.toFixed(2) }}</p>
            <p class="stat-label">Total cost basis</p>
          </div>
          
          <div class="stat-card card">
            <h3>Items Listed</h3>
            <p class="stat-value">{{ listedOnlineCount }}</p>
            <p class="stat-label">Active marketplace listings</p>
          </div>
          
          <div class="stat-card card">
            <h3>Projected Profit</h3>
            <p class="stat-value" :class="projectedProfit >= 0 ? 'positive' : 'negative'">
              {{ projectedProfit >= 0 ? '+' : '' }}${{ projectedProfit.toFixed(2) }}
            </p>
            <p class="stat-label">Based on expected prices</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useItemStore } from '@/stores/item'

const itemStore = useItemStore()

const loading = ref(true)
const stats = ref([])

const ownedCount = computed(() => {
  if (!Array.isArray(stats.value)) return 0
  const owned = stats.value.find(s => s.status === 'owned')
  return owned?.count || 0
})

const soldCount = computed(() => {
  if (!Array.isArray(stats.value)) return 0
  const sold = stats.value.find(s => s.status === 'sold')
  return sold?.count || 0
})

const totalInvestment = computed(() => {
  if (!Array.isArray(stats.value)) return 0
  const owned = stats.value.find(s => s.status === 'owned')
  return parseFloat(owned?.totalInvestment || 0)
})

const totalRevenue = computed(() => {
  if (!Array.isArray(stats.value)) return 0
  const sold = stats.value.find(s => s.status === 'sold')
  return parseFloat(sold?.totalSalePrice || 0)
})

const profit = computed(() => {
  if (!Array.isArray(stats.value)) return 0
  const sold = stats.value.find(s => s.status === 'sold')
  const soldInvestment = parseFloat(sold?.totalInvestment || 0)
  return totalRevenue.value - soldInvestment
})

const forSaleCount = computed(() => {
  if (!Array.isArray(stats.value)) return 0
  const forSale = stats.value.find(s => s.status === 'for_sale')
  return forSale?.count || 0
})

const forSaleInvestment = computed(() => {
  if (!Array.isArray(stats.value)) return 0
  const forSale = stats.value.find(s => s.status === 'for_sale')
  return parseFloat(forSale?.totalInvestment || 0)
})

const expectedSaleValue = computed(() => {
  if (!Array.isArray(stats.value)) return 0
  const forSale = stats.value.find(s => s.status === 'for_sale')
  return parseFloat(forSale?.totalSalePrice || 0)
})

const listedOnlineCount = computed(() => {
  if (!Array.isArray(stats.value)) return 0
  const forSale = stats.value.find(s => s.status === 'for_sale')
  return forSale?.listedOnlineCount || 0
})

const projectedProfit = computed(() => {
  return expectedSaleValue.value - forSaleInvestment.value
})

onMounted(async () => {
  loading.value = true
  try {
    const response = await itemStore.getStats()
    stats.value = response.stats || []
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

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

@media (min-width: 769px) {
  .dashboard-header {
    margin-bottom: 2rem;
  }
}

.dashboard-header h2 {
  color: var(--text-primary);
  font-size: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
}

.stat-card {
  text-align: center;
  padding: 1.25rem 1rem;
}

@media (min-width: 640px) {
  .stat-card {
    padding: 1.5rem;
  }
}

.stat-card h3 {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
  word-break: break-word;
}

@media (min-width: 640px) {
  .stat-value {
    font-size: 2rem;
  }
}

.stat-label {
  font-size: 0.6875rem;
  color: var(--text-secondary);
}

@media (min-width: 640px) {
  .stat-label {
    font-size: 0.75rem;
  }
}

.profit-card {
  text-align: center;
  padding: 1.5rem 1rem;
}

@media (min-width: 640px) {
  .profit-card {
    padding: 2rem;
  }
}

.profit-card h3 {
  font-size: 0.9375rem;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

@media (min-width: 640px) {
  .profit-card h3 {
    font-size: 1rem;
    margin-bottom: 1rem;
  }
}

.profit-value {
  font-size: 2rem;
  font-weight: 700;
  word-break: break-word;
}

@media (min-width: 640px) {
  .profit-value {
    font-size: 3rem;
  }
}

.profit-value.positive {
  color: var(--success-color);
}

.profit-value.negative {
  color: var(--danger-color);
}

.for-sale-section {
  margin-top: 2rem;
}

.section-title {
  font-size: 1.125rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
  font-weight: 600;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  gap: 1rem;
}

.loading-container p {
  color: var(--text-secondary);
  font-size: 0.9375rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@media (min-width: 769px) {
  .for-sale-section {
    margin-top: 3rem;
  }
  
  .section-title {
    font-size: 1.25rem;
    margin-bottom: 1.5rem;
  }
}
</style>
