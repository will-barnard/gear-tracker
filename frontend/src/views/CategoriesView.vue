<template>
  <div class="categories-view">
    <NavBar />
    
    <div class="container">
      <div class="categories-header">
        <h2>Categories</h2>
        <button @click="showAddModal = true" class="btn btn-primary">Add Category</button>
      </div>
      
      <div v-if="categoryStore.loading" class="loading">Loading...</div>
      
      <div v-else-if="categories.length === 0" class="empty-state card">
        <p>No categories yet. Create your first category!</p>
      </div>
      
      <div v-else class="categories-list">
        <div v-for="category in categoriesWithStats" :key="category.id" class="category-item card">
          <div class="category-main">
            <div class="category-info">
              <div class="category-color" :style="{ backgroundColor: category.color }"></div>
              <div>
                <h3>{{ category.name }}</h3>
                <p v-if="category.description">{{ category.description }}</p>
              </div>
            </div>
            <div class="category-actions">
              <button @click="editCategory(category)" class="btn btn-secondary">Edit</button>
              <button @click="deleteCategory(category.id)" class="btn btn-danger">Delete</button>
            </div>
          </div>
          
          <div class="category-stats">
            <div class="stat-item">
              <span class="stat-label">Owned</span>
              <span class="stat-value">{{ category.stats.ownedCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Sold</span>
              <span class="stat-value">{{ category.stats.soldCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Current Value</span>
              <span class="stat-value">${{ category.stats.currentValue.toFixed(2) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total Profit</span>
              <span class="stat-value" :class="category.stats.profit >= 0 ? 'profit-positive' : 'profit-negative'">
                {{ category.stats.profit >= 0 ? '+' : '' }}${{ category.stats.profit.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Modal -->
    <div v-if="showAddModal || editingCategory" class="modal" @click.self="closeModal">
      <div class="modal-content card">
        <h3>{{ editingCategory ? 'Edit Category' : 'Add Category' }}</h3>
        
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-input"
              required
            />
          </div>
          
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea
              v-model="formData.description"
              class="form-input"
              rows="2"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">Color</label>
            <input
              v-model="formData.color"
              type="color"
              class="form-input color-input"
            />
          </div>
          
          <div v-if="error" class="error-message">
            {{ error }}
          </div>
          
          <div class="modal-actions">
            <button type="button" @click="closeModal" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/category'
import { useItemStore } from '@/stores/item'
import NavBar from '@/components/NavBar.vue'

const categoryStore = useCategoryStore()
const itemStore = useItemStore()

const categories = ref([])
const items = ref([])
const showAddModal = ref(false)
const editingCategory = ref(null)
const loading = ref(false)
const error = ref('')

const formData = ref({
  name: '',
  description: '',
  color: '#3B82F6'
})

const categoriesWithStats = computed(() => {
  return categories.value.map(category => {
    const categoryItems = items.value.filter(item => item.categoryId === category.id)
    
    const ownedItems = categoryItems.filter(item => item.status === 'owned')
    const soldItems = categoryItems.filter(item => item.status === 'sold')
    
    const currentValue = ownedItems.reduce((sum, item) => 
      sum + parseFloat(item.purchasePrice || 0), 0
    )
    
    const totalRevenue = soldItems.reduce((sum, item) => 
      sum + parseFloat(item.salePrice || 0), 0
    )
    
    const totalCost = soldItems.reduce((sum, item) => 
      sum + parseFloat(item.purchasePrice || 0), 0
    )
    
    const profit = totalRevenue - totalCost
    
    return {
      ...category,
      stats: {
        ownedCount: ownedItems.length,
        soldCount: soldItems.length,
        currentValue,
        profit
      }
    }
  })
})

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  
  try {
    if (editingCategory.value) {
      await categoryStore.updateCategory(editingCategory.value.id, formData.value)
    } else {
      await categoryStore.createCategory(formData.value)
    }
    
    categories.value = categoryStore.categories
    closeModal()
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to save category'
  } finally {
    loading.value = false
  }
}

const editCategory = (category) => {
  editingCategory.value = category
  formData.value = {
    name: category.name,
    description: category.description || '',
    color: category.color || '#3B82F6'
  }
}

const deleteCategory = async (id) => {
  if (confirm('Are you sure you want to delete this category?')) {
    await categoryStore.deleteCategory(id)
    categories.value = categoryStore.categories
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingCategory.value = null
  formData.value = {
    name: '',
    description: '',
    color: '#3B82F6'
  }
  error.value = ''
}

onMounted(async () => {
  await categoryStore.fetchCategories()
  categories.value = categoryStore.categories
  
  await itemStore.fetchItems({ page: 1, limit: 1000 })
  items.value = itemStore.items
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

.categories-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.categories-header h2 {
  font-size: 1.5rem;
}

@media (min-width: 769px) {
  .categories-header {
    margin-bottom: 2rem;
  }
}

.loading,
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--text-secondary);
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 769px) {
  .categories-list {
    gap: 1.5rem;
  }
}

.category-item {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

@media (min-width: 640px) {
  .category-main {
    flex-wrap: nowrap;
  }
}

.category-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.category-color {
  width: 40px;
  height: 40px;
  border-radius: 0.375rem;
  flex-shrink: 0;
}

.category-info h3 {
  margin: 0;
  color: var(--text-primary);
  word-break: break-word;
}

.category-info p {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
  word-break: break-word;
}

.category-actions {
  display: flex;
  gap: 0.5rem;
  width: 100%;
}

@media (min-width: 640px) {
  .category-actions {
    width: auto;
  }
}

.category-actions .btn {
  flex: 1;
  min-height: 44px;
}

@media (min-width: 640px) {
  .category-actions .btn {
    flex: initial;
  }
}

.category-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

@media (min-width: 640px) {
  .category-stats {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.profit-positive {
  color: var(--success-color);
}

.profit-negative {
  color: var(--danger-color);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  font-size: 1.25rem;
}

@media (min-width: 640px) {
  .modal-content h3 {
    font-size: 1.5rem;
  }
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-direction: column;
}

@media (min-width: 640px) {
  .modal-actions {
    flex-direction: row;
  }
}

.modal-actions .btn {
  flex: 1;
}

.color-input {
  height: 50px;
  cursor: pointer;
}

.error-message {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background-color: #FEE2E2;
  color: #DC2626;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}
</style>
