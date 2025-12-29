<template>
  <div class="item-detail-view">
    <NavBar />
    
    <div class="container">
      <div v-if="loading" class="loading">Loading...</div>
      
      <div v-else-if="item">
        <div class="detail-header">
          <div>
            <h2>{{ item.name }}</h2>
            <span class="status-badge" :class="item.status">{{ item.status }}</span>
          </div>
          <div class="header-actions">
            <router-link :to="`/items/${item.id}/edit`" class="btn btn-primary">Edit</router-link>
            <button @click="handleDelete" class="btn btn-danger">Delete</button>
          </div>
        </div>
        
        <div class="detail-grid">
          <div class="detail-card card">
            <h3>Basic Information</h3>
            <dl>
              <dt>Brand</dt>
              <dd>{{ item.brand || '-' }}</dd>
              <dt>Model</dt>
              <dd>{{ item.model || '-' }}</dd>
              <dt>Category</dt>
              <dd>{{ item.category?.name || '-' }}</dd>
              <dt>Serial Number</dt>
              <dd>{{ item.serialNumber || '-' }}</dd>
              <dt>Condition</dt>
              <dd>{{ item.condition || '-' }}</dd>
            </dl>
          </div>
          
          <div class="detail-card card">
            <h3>Purchase Details</h3>
            <dl>
              <dt>Purchase Price</dt>
              <dd>{{ item.purchasePrice ? `$${parseFloat(item.purchasePrice).toFixed(2)}` : '-' }}</dd>
              <dt>Purchase Date</dt>
              <dd>{{ item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : '-' }}</dd>
              <dt>Purchase Location</dt>
              <dd>{{ item.purchaseLocation || '-' }}</dd>
            </dl>
          </div>
          
          <div v-if="item.status === 'sold'" class="detail-card card">
            <h3>Sale Details</h3>
            <dl>
              <dt>Sale Price</dt>
              <dd>{{ item.salePrice ? `$${parseFloat(item.salePrice).toFixed(2)}` : '-' }}</dd>
              <dt>Sale Date</dt>
              <dd>{{ item.saleDate ? new Date(item.saleDate).toLocaleDateString() : '-' }}</dd>
              <dt>Sale Location</dt>
              <dd>{{ item.saleLocation || '-' }}</dd>
              <dt>Profit/Loss</dt>
              <dd :class="profit >= 0 ? 'profit' : 'loss'">
                {{ profit >= 0 ? '+' : '' }}${{ profit.toFixed(2) }}
              </dd>
            </dl>
          </div>
          
          <div class="detail-card card full-width">
            <h3>Additional Costs</h3>
            <div v-if="item.additionalCosts?.length">
              <table class="costs-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="cost in item.additionalCosts" :key="cost.id">
                    <td data-label="Date">{{ new Date(cost.date).toLocaleDateString() }}</td>
                    <td data-label="Description">{{ cost.description }}</td>
                    <td data-label="Type">{{ cost.type || '-' }}</td>
                    <td data-label="Amount">${{ parseFloat(cost.amount).toFixed(2) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3"><strong>Total Additional Costs</strong></td>
                    <td><strong>${{ totalAdditionalCosts.toFixed(2) }}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p v-else class="empty-message">No additional costs recorded</p>
          </div>
          
          <div v-if="item.description" class="detail-card card full-width">
            <h3>Description</h3>
            <p>{{ item.description }}</p>
          </div>
          
          <div v-if="item.notes" class="detail-card card full-width">
            <h3>Notes</h3>
            <p>{{ item.notes }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useItemStore } from '@/stores/item'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const route = useRoute()
const itemStore = useItemStore()

const item = ref(null)
const loading = ref(true)

const totalAdditionalCosts = computed(() => {
  if (!item.value?.additionalCosts?.length) return 0
  return item.value.additionalCosts.reduce((sum, cost) => sum + parseFloat(cost.amount), 0)
})

const profit = computed(() => {
  if (!item.value || item.value.status !== 'sold') return 0
  const sale = parseFloat(item.value.salePrice || 0)
  const purchase = parseFloat(item.value.purchasePrice || 0)
  return sale - purchase - totalAdditionalCosts.value
})

const handleDelete = async () => {
  if (confirm('Are you sure you want to delete this item?')) {
    await itemStore.deleteItem(item.value.id)
    router.push('/items')
  }
}

onMounted(async () => {
  try {
    item.value = await itemStore.fetchItem(route.params.id)
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

@media (min-width: 1024px) {
  .detail-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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

.costs-table {
  width: 100%;
  border-collapse: collapse;
  overflow-x: auto;
  display: block;
}

@media (min-width: 640px) {
  .costs-table {
    display: table;
  }
}

.costs-table thead {
  display: none;
}

@media (min-width: 640px) {
  .costs-table thead {
    display: table-header-group;
  }
}

.costs-table tr {
  display: block;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  padding: 0.75rem;
}

@media (min-width: 640px) {
  .costs-table tr {
    display: table-row;
    margin-bottom: 0;
    border: none;
    border-radius: 0;
    padding: 0;
  }
}

.costs-table th,
.costs-table td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  display: block;
}

@media (min-width: 640px) {
  .costs-table th,
  .costs-table td {
    display: table-cell;
    padding: 0.75rem;
  }
}

.costs-table th {
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--background);
}

.costs-table tbody tr {
  border-bottom: none;
}

@media (min-width: 640px) {
  .costs-table tbody tr {
    border-bottom: 1px solid var(--border-color);
  }
}

.costs-table td:before {
  content: attr(data-label);
  font-weight: 500;
  color: var(--text-secondary);
  display: inline-block;
  width: 120px;
}

@media (min-width: 640px) {
  .costs-table td:before {
    content: none;
  }
}

.costs-table tfoot td {
  font-weight: 500;
  border-top: 2px solid var(--border-color);
}

.empty-message {
  color: var(--text-secondary);
  font-style: italic;
}
</style>
