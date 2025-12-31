<template>
  <div class="dashboard">
    <NavBar />
    
    <div class="container">
      <div class="dashboard-header">
        <h2>Dashboard</h2>
        <router-link to="/items/new" class="btn btn-primary">Quick Add Item</router-link>
      </div>
      
      <div class="stats-grid">
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
      
      <div class="profit-card card">
        <h3>Total Profit/Loss</h3>
        <p class="profit-value" :class="profit >= 0 ? 'positive' : 'negative'">
          {{ profit >= 0 ? '+' : '' }}${{ profit.toFixed(2) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useItemStore } from '@/stores/item'

const itemStore = useItemStore()

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

onMounted(async () => {
  const response = await itemStore.getStats()
  stats.value = response.stats || []
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
</style>
