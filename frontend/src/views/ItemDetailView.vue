<template>
  <div class="item-detail-view">
    <NavBar />
    
    <div class="container">
      <div v-if="loading" class="loading">Loading...</div>
      
      <div v-else-if="item">
        <div class="detail-header">
          <div>
            <h2>{{ item.name }}</h2>
            <span class="status-badge" :class="item.status">{{ getStatusLabel(item.status) }}</span>
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
              <dd>{{ item.category?.name.replace(/ /g, '\u00A0') || '-' }}</dd>
              <dt v-if="item.purchaseBundle || item.saleBundle">Bundles</dt>
              <dd v-if="item.purchaseBundle || item.saleBundle">
                <div class="bundle-links">
                  <router-link v-if="item.purchaseBundle" :to="`/bundles/${item.purchaseBundle.id}`" class="bundle-link">
                    <span class="bundle-type">Buy:</span> {{ item.purchaseBundle.name }}
                  </router-link>
                  <router-link v-if="item.saleBundle" :to="`/bundles/${item.saleBundle.id}`" class="bundle-link">
                    <span class="bundle-type">Sell:</span> {{ item.saleBundle.name }}
                  </router-link>
                </div>
              </dd>
              <dt>Serial Number</dt>
              <dd>{{ item.serialNumber || '-' }}</dd>
              <dt>Condition</dt>
              <dd>{{ item.condition || '-' }}</dd>
            </dl>
          </div>
          
          <div class="detail-card card">
            <h3>Purchase Details</h3>
            <dl>
              <dt v-if="item.purchaseBundleId">Cost Share (from bundle)</dt>
              <dt v-else>Purchase Price</dt>
              <dd v-if="item.purchaseBundleId && purchaseBundleStats">
                ${{ purchaseBundleStats.costPerItem.toFixed(2) }}
                <span class="help-text">({{ item.purchaseBundle.name }})</span>
              </dd>
              <dd v-else>{{ item.purchasePrice ? `$${parseFloat(item.purchasePrice).toFixed(2)}` : '-' }}</dd>
              <dt>Purchase Date</dt>
              <dd>{{ item.purchaseDate || item.purchaseBundle?.purchaseDate ? new Date(item.purchaseDate || item.purchaseBundle.purchaseDate).toLocaleDateString() : '-' }}</dd>
              <dt>Purchase Location</dt>
              <dd>{{ item.purchaseLocation || item.purchaseBundle?.purchaseLocation || '-' }}</dd>
            </dl>
          </div>
          
          <div v-if="item.status === 'for_sale'" class="detail-card card">
            <h3>For Sale Details</h3>
            <dl>
              <dt>Projected Sale Price</dt>
              <dd>{{ item.expectedSalePrice ? `$${parseFloat(item.expectedSalePrice).toFixed(2)}` : '-' }}</dd>
              <dt>Listed Online</dt>
              <dd>{{ item.isListedOnline ? '✓ Yes' : '✗ No' }}</dd>
              <dt>Projected Profit</dt>
              <dd v-if="item.expectedSalePrice" :class="projectedProfit >= 0 ? 'profit' : 'loss'">
                {{ projectedProfit >= 0 ? '+' : '' }}${{ projectedProfit.toFixed(2) }}
              </dd>
              <dd v-else>-</dd>
            </dl>
          </div>
          
          <div v-if="item.status === 'sold'" class="detail-card card">
            <h3>Sale Details</h3>
            <dl>
              <dt v-if="item.saleBundleId">Sale Bundle Price</dt>
              <dt v-else>Sale Price</dt>
              <dd v-if="item.saleBundleId && item.saleBundle">
                ${{ parseFloat(item.saleBundle.salePrice || 0).toFixed(2) }}
                <span class="help-text">({{ item.saleBundle.name }})</span>
              </dd>
              <dd v-else>{{ item.salePrice ? `$${parseFloat(item.salePrice).toFixed(2)}` : '-' }}</dd>
              <dt>Sale Date</dt>
              <dd>{{ item.saleDate || item.saleBundle?.saleDate ? new Date(item.saleDate || item.saleBundle.saleDate).toLocaleDateString() : '-' }}</dd>
              <dt>Sale Location</dt>
              <dd>{{ item.saleLocation || item.saleBundle?.saleLocation || '-' }}</dd>
              <dt v-if="!item.saleBundleId">Profit/Loss</dt>
              <dd v-if="!item.saleBundleId" :class="profit >= 0 ? 'profit' : 'loss'">
                {{ profit >= 0 ? '+' : '' }}${{ profit.toFixed(2) }}
              </dd>
            </dl>
          </div>
          
          <div class="detail-card card full-width">
            <div class="costs-header">
              <h3>Additional Costs</h3>
              <button @click="showAddCostModal = true" class="btn btn-primary btn-sm">
                Add Cost
              </button>
            </div>
            <div v-if="item.additionalCosts?.length">
              <table class="costs-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="cost in item.additionalCosts" :key="cost.id">
                    <td data-label="Date">{{ new Date(cost.date).toLocaleDateString() }}</td>
                    <td data-label="Description">{{ cost.description }}</td>
                    <td data-label="Type">
                      <span :class="['badge', cost.type === 'income' ? 'badge-income' : 'badge-expense']">
                        {{ cost.type === 'income' ? 'Income' : 'Expense' }}
                      </span>
                    </td>
                    <td data-label="Category">{{ cost.category || '-' }}</td>
                    <td data-label="Amount">${{ parseFloat(cost.amount).toFixed(2) }}</td>
                    <td data-label="Actions">
                      <button @click="editCost(cost)" class="btn-icon" title="Edit">
                        ✏️
                      </button>
                      <button @click="deleteCost(cost.id)" class="btn-icon" title="Delete">
                        🗑️
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5"><strong>Net Additional Costs</strong></td>
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

    <!-- Add/Edit Cost Modal -->
    <div v-if="showAddCostModal || editingCost" class="modal-overlay" @click.self="closeCostModal">
      <div class="modal-content">
        <h3>{{ editingCost ? 'Edit Cost' : 'Add Cost' }}</h3>
        <form @submit.prevent="saveCost">
          <div class="form-group">
            <label class="form-label">Date</label>
            <input
              v-model="costForm.date"
              type="date"
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Description *</label>
            <input
              v-model="costForm.description"
              type="text"
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Type *</label>
            <div class="radio-group">
              <label class="radio-label">
                <input
                  v-model="costForm.costType"
                  type="radio"
                  value="expense"
                  class="radio-input"
                />
                <span>Expense</span>
              </label>
              <label class="radio-label">
                <input
                  v-model="costForm.costType"
                  type="radio"
                  value="income"
                  class="radio-input"
                />
                <span>Income/Credit</span>
              </label>
            </div>
            <small class="form-hint">Expenses add to cost, income offsets cost (e.g., selling a replaced part)</small>
          </div>
          
          <div class="form-group">
            <label class="form-label">Category</label>
            <input
              v-model="costForm.category"
              type="text"
              class="form-input"
              placeholder="e.g., Repair, Shipping, Parts"
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Amount *</label>
            <input
              v-model="costForm.amount"
              type="number"
              step="0.01"
              min="0"
              class="form-input"
              required
            />
          </div>
          
          <div v-if="costError" class="error-message">
            {{ costError }}
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="closeCostModal" class="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" :disabled="savingCost">
              {{ savingCost ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useItemStore } from '@/stores/item'
import { useBundleStore } from '@/stores/bundle'
import NavBar from '@/components/NavBar.vue'
import api from '@/services/api'

const router = useRouter()
const route = useRoute()
const itemStore = useItemStore()
const bundleStore = useBundleStore()

const item = ref(null)
const purchaseBundleStats = ref(null)
const loading = ref(true)
const showAddCostModal = ref(false)
const editingCost = ref(null)
const costForm = ref({
  date: new Date().toISOString().split('T')[0],
  description: '',
  costType: 'expense',
  category: '',
  amount: ''
})
const costError = ref('')
const savingCost = ref(false)

const totalAdditionalCosts = computed(() => {
  if (!item.value?.additionalCosts?.length) return 0
  return item.value.additionalCosts.reduce((sum, cost) => {
    const amount = parseFloat(cost.amount)
    return sum + (cost.type === 'income' ? -amount : amount)
  }, 0)
})

const itemCost = computed(() => {
  if (item.value?.purchaseBundleId && purchaseBundleStats.value) {
    return purchaseBundleStats.value.costPerItem
  }
  return parseFloat(item.value?.purchasePrice || 0)
})

const profit = computed(() => {
  if (!item.value || item.value.status !== 'sold') return 0
  const sale = parseFloat(item.value.salePrice || 0)
  return sale - itemCost.value - totalAdditionalCosts.value
})

const projectedProfit = computed(() => {
  if (!item.value || item.value.status !== 'for_sale' || !item.value.expectedSalePrice) return 0
  const expectedSale = parseFloat(item.value.expectedSalePrice || 0)
  return expectedSale - itemCost.value - totalAdditionalCosts.value
})

const getStatusLabel = (status) => {
  const labels = {
    'owned': 'Owned',
    'for_sale': 'For\u00A0Sale',
    'sold': 'Sold'
  }
  return labels[status] || status
}

const editCost = (cost) => {
  editingCost.value = cost
  costForm.value = {
    date: cost.date ? new Date(cost.date).toISOString().split('T')[0] : '',
    description: cost.description,
    costType: cost.type || 'expense',
    category: cost.category || '',
    amount: cost.amount
  }
}

const closeCostModal = () => {
  showAddCostModal.value = false
  editingCost.value = null
  costForm.value = {
    date: new Date().toISOString().split('T')[0],
    description: '',
    costType: 'expense',
    category: '',
    amount: ''
  }
  costError.value = ''
}

const saveCost = async () => {
  costError.value = ''
  savingCost.value = true
  
  try {
    const data = {
      itemId: item.value.id,
      date: costForm.value.date,
      description: costForm.value.description,
      type: costForm.value.costType,
      category: costForm.value.category || null,
      amount: parseFloat(costForm.value.amount)
    }
    
    if (editingCost.value) {
      await api.put(`/costs/${editingCost.value.id}`, data)
    } else {
      await api.post('/costs', data)
    }
    
    // Refresh item data
    item.value = await itemStore.fetchItem(route.params.id)
    closeCostModal()
  } catch (error) {
    costError.value = error.response?.data?.error || 'Failed to save cost'
  } finally {
    savingCost.value = false
  }
}

const deleteCost = async (costId) => {
  if (!confirm('Are you sure you want to delete this cost?')) return
  
  try {
    await api.delete(`/costs/${costId}`)
    // Refresh item data
    item.value = await itemStore.fetchItem(route.params.id)
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to delete cost')
  }
}

const handleDelete = async () => {
  if (confirm('Are you sure you want to delete this item?')) {
    await itemStore.deleteItem(item.value.id)
    router.push('/items')
  }
}

onMounted(async () => {
  try {
    item.value = await itemStore.fetchItem(route.params.id)
    if (item.value.purchaseBundleId) {
      purchaseBundleStats.value = await bundleStore.getBundleStats(item.value.purchaseBundleId)
    }
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

.status-badge.for_sale {
  background: #FEF3C7;
  color: #92400E;
}

.status-badge.sold {
  background: #D1FAE5;
  color: #065F46;
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.badge-expense {
  background: #FEE2E2;
  color: #DC2626;
}

.badge-income {
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

.bundle-links {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bundle-link {
  color: var(--primary-color);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.bundle-link:hover {
  text-decoration: underline;
}

.bundle-type {
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.help-text {
  font-size: 0.75rem;
  color: var(--text-secondary);
  display: block;
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

.costs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1rem;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.btn-icon:hover {
  opacity: 1;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-bottom: 1.5rem;
  color: var(--text-primary);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
}

.error-message {
  padding: 0.75rem;
  background-color: #FEE2E2;
  color: #DC2626;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  margin-top: 1rem;
}

.radio-group {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.radio-input {
  cursor: pointer;
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
}
</style>
