<template>
  <div class="items-view">
    <NavBar />
    
    <div class="container">
      <div class="items-header">
        <h2>Items</h2>
        <div class="header-actions">
          <button @click="viewMode = viewMode === 'grid' ? 'table' : 'grid'" class="btn btn-secondary">
            {{ viewMode === 'grid' ? '📋 Table' : '🎴 Grid' }}
          </button>
          <button @click="showFilters = !showFilters" class="btn btn-secondary">
            {{ showFilters ? 'Hide' : 'Show' }} Filters
          </button>
          <router-link to="/items/new" class="btn btn-primary">Add Item</router-link>
        </div>
      </div>
      
      <div v-show="showFilters" class="filters card">
        <div class="filters-row">
          <input
            v-model="filters.search"
            type="text"
            class="form-input"
            placeholder="Search items..."
            @input="applyFilters"
          />
          
          <select v-model="filters.status" class="form-input" @change="applyFilters">
            <option value="">All Statuses</option>
            <option value="owned">Owned</option>
            <option value="sold">Sold</option>
          </select>
          
          <select v-model="filters.categoryId" class="form-input" @change="applyFilters">
            <option value="">All Categories</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          
          <select v-model="filters.sortBy" class="form-input" @change="applyFilters">
            <option value="createdAt">Date Added</option>
            <option value="name">Name</option>
            <option value="purchasePrice">Price</option>
            <option value="purchaseDate">Purchase Date</option>
          </select>
        </div>
      </div>
      
      <div v-if="itemStore.loading" class="loading">Loading...</div>
      
      <div v-else-if="itemStore.items.length === 0" class="empty-state card">
        <p>No items found. Add your first item to get started!</p>
      </div>
      
      <!-- Grid View -->
      <div v-else-if="viewMode === 'grid'" class="items-grid">
        <div v-for="item in itemStore.items" :key="item.id" class="item-card card">
          <div class="item-header">
            <h3>{{ item.name }}</h3>
            <span class="status-badge" :class="item.status">{{ item.status }}</span>
          </div>
          
          <div class="item-details">
            <p v-if="item.brand || item.model">{{ [item.brand, item.model].filter(Boolean).join(' ') }}</p>
            <p v-if="item.category" class="category-display">
              <strong>Category:</strong>
              <span class="category-badge" :style="{ backgroundColor: item.category.color }">
                {{ item.category.name }}
              </span>
            </p>
            <p v-if="item.purchasePrice"><strong>Purchase:</strong> ${{ parseFloat(item.purchasePrice).toFixed(2) }}</p>
            <p><strong>Add. Costs:</strong> ${{ calculateAdditionalCosts(item).toFixed(2) }}</p>
            <p v-if="item.salePrice"><strong>Sale:</strong> ${{ parseFloat(item.salePrice).toFixed(2) }}</p>
          </div>
          
          <div class="item-actions">
            <router-link :to="`/items/${item.id}`" class="btn btn-secondary">View</router-link>
            <router-link :to="`/items/${item.id}/edit`" class="btn btn-primary">Edit</router-link>
          </div>
        </div>
      </div>
      
      <!-- Table View -->
      <div v-else class="items-table-container card">
        <table class="items-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Brand</th>
              <th>Model</th>
              <th>Category</th>
              <th>Status</th>
              <th>Purchase</th>
              <th>Sale</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in itemStore.items" :key="item.id">
              <td data-label="Name">{{ item.name }}</td>
              <td data-label="Brand">{{ item.brand || '-' }}</td>
              <td data-label="Model">{{ item.model || '-' }}</td>
              <td data-label="Category">
                <span v-if="item.category" class="category-badge" :style="{ backgroundColor: item.category.color }">
                  {{ item.category.name }}
                </span>
                <span v-else>-</span>
              </td>
              <td data-label="Status">
                <span class="status-badge" :class="item.status">{{ item.status }}</span>
              </td>
              <td data-label="Purchase">${{ item.purchasePrice ? parseFloat(item.purchasePrice).toFixed(2) : '0.00' }}</td>
              <td data-label="Sale">${{ item.salePrice ? parseFloat(item.salePrice).toFixed(2) : '-' }}</td>
              <td data-label="Actions" class="table-actions">
                <router-link :to="`/items/${item.id}`" class="btn btn-secondary btn-sm">View</router-link>
                <router-link :to="`/items/${item.id}/edit`" class="btn btn-primary btn-sm">Edit</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="itemStore.pagination.totalPages > 1" class="pagination">
        <button
          @click="changePage(itemStore.pagination.page - 1)"
          :disabled="itemStore.pagination.page === 1"
          class="btn btn-secondary"
        >
          Previous
        </button>
        <span>Page {{ itemStore.pagination.page }} of {{ itemStore.pagination.totalPages }}</span>
        <button
          @click="changePage(itemStore.pagination.page + 1)"
          :disabled="itemStore.pagination.page === itemStore.pagination.totalPages"
          class="btn btn-secondary"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useItemStore } from '@/stores/item'
import { useCategoryStore } from '@/stores/category'

const itemStore = useItemStore()
const categoryStore = useCategoryStore()

const showFilters = ref(false)
const viewMode = ref('grid')

const filters = ref({
  search: '',
  status: '',
  categoryId: '',
  sortBy: 'createdAt',
  page: 1
})

const categories = ref([])

const calculateAdditionalCosts = (item) => {
  if (!item.additionalCosts?.length) return 0
  return item.additionalCosts.reduce((sum, cost) => sum + parseFloat(cost.amount || 0), 0)
}

const applyFilters = () => {
  filters.value.page = 1
  itemStore.fetchItems(filters.value)
}

const changePage = (page) => {
  filters.value.page = page
  itemStore.fetchItems(filters.value)
}

onMounted(async () => {
  await categoryStore.fetchCategories()
  categories.value = categoryStore.categories
  await itemStore.fetchItems(filters.value)
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

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.items-header h2 {
  font-size: 1.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@media (min-width: 769px) {
  .items-header {
    margin-bottom: 2rem;
  }
}

.filters {
  margin-bottom: 1.5rem;
}

.filters-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .filters-row {
    grid-template-columns: 1fr 1fr;
  }
}

@media (min-width: 1024px) {
  .filters-row {
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 1rem;
  }
  
  .filters {
    margin-bottom: 2rem;
  }
}

.items-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 640px) {
  .items-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
}

.item-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
}

.item-header h3 {
  color: var(--text-primary);
  margin: 0;
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

.item-details p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.category-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.category-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

.item-actions .btn {
  flex: 1;
  text-align: center;
  text-decoration: none;
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.pagination span {
  font-size: 0.875rem;
}

@media (min-width: 640px) {
  .pagination span {
    font-size: 1rem;
  }
}

/* Table View Styles */
.items-table-container {
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

@media (min-width: 1024px) {
  .items-table-container {
    margin-bottom: 2rem;
  }
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table thead {
  display: none;
  background: var(--background);
}

@media (min-width: 768px) {
  .items-table thead {
    display: table-header-group;
  }
}

.items-table th {
  text-align: left;
  padding: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  border-bottom: 2px solid var(--border-color);
  white-space: nowrap;
}

.items-table tbody tr {
  display: block;
  margin-bottom: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
}

@media (min-width: 768px) {
  .items-table tbody tr {
    display: table-row;
    margin-bottom: 0;
    border: none;
    border-radius: 0;
    border-bottom: 1px solid var(--border-color);
  }
  
  .items-table tbody tr:hover {
    background: var(--background);
  }
}

.items-table td {
  display: block;
  padding: 0.5rem 0.75rem;
  text-align: right;
  position: relative;
}

@media (min-width: 768px) {
  .items-table td {
    display: table-cell;
    text-align: left;
    padding: 0.75rem;
  }
}

.items-table td:before {
  content: attr(data-label);
  font-weight: 500;
  color: var(--text-secondary);
  float: left;
}

@media (min-width: 768px) {
  .items-table td:before {
    content: none;
  }
}

.items-table .table-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

@media (min-width: 768px) {
  .items-table .table-actions {
    justify-content: flex-start;
    border-top: none;
    padding-top: 0.75rem;
  }
}

.items-table .table-actions .btn {
  text-decoration: none;
}

.btn-sm {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
}

@media (min-width: 768px) {
  .btn-sm {
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
  }
}
</style>
