<template>
  <div class="item-form-view">
    <NavBar />
    
    <div class="container">
      <div class="form-header">
        <h2>{{ isEdit ? 'Edit Item' : 'Add New Item' }}</h2>
        <router-link to="/items" class="btn btn-secondary">Cancel</router-link>
      </div>
      
      <form @submit.prevent="handleSubmit" class="item-form card">
        <div class="form-section">
          <h3>Basic Information</h3>
          
          <div class="form-group">
            <label class="form-label">Name *</label>
            <input
              v-model="formData.name"
              type="text"
              class="form-input"
              required
            />
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Brand</label>
              <input
                v-model="formData.brand"
                type="text"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Model</label>
              <input
                v-model="formData.model"
                type="text"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select v-model="formData.categoryId" class="form-input">
                <option value="">Select a category</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Status</label>
              <select v-model="formData.status" class="form-input">
                <option value="owned">Owned</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea
              v-model="formData.description"
              class="form-input"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div class="form-section">
          <h3>Purchase Details</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Purchase Price</label>
              <input
                v-model="formData.purchasePrice"
                type="number"
                step="0.01"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Purchase Date</label>
              <input
                v-model="formData.purchaseDate"
                type="date"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Purchase Location</label>
            <input
              v-model="formData.purchaseLocation"
              type="text"
              class="form-input"
            />
          </div>
        </div>
        
        <div class="form-section" v-if="formData.status === 'sold'">
          <h3>Sale Details</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Sale Price</label>
              <input
                v-model="formData.salePrice"
                type="number"
                step="0.01"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Sale Date</label>
              <input
                v-model="formData.saleDate"
                type="date"
                class="form-input"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Sale Location</label>
            <input
              v-model="formData.saleLocation"
              type="text"
              class="form-input"
            />
          </div>
        </div>
        
        <div class="form-section">
          <h3>Additional Information</h3>
          
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Serial Number</label>
              <input
                v-model="formData.serialNumber"
                type="text"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">Condition</label>
              <input
                v-model="formData.condition"
                type="text"
                class="form-input"
                placeholder="e.g., Excellent, Good, Fair"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea
              v-model="formData.notes"
              class="form-input"
              rows="3"
            ></textarea>
          </div>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Saving...' : (isEdit ? 'Update Item' : 'Create Item') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useItemStore } from '@/stores/item'
import { useCategoryStore } from '@/stores/category'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const route = useRoute()
const itemStore = useItemStore()
const categoryStore = useCategoryStore()

const isEdit = computed(() => route.name === 'EditItem')

const formData = ref({
  name: '',
  brand: '',
  model: '',
  categoryId: '',
  status: 'owned',
  description: '',
  purchasePrice: '',
  purchaseDate: '',
  purchaseLocation: '',
  salePrice: '',
  saleDate: '',
  saleLocation: '',
  serialNumber: '',
  condition: '',
  notes: ''
})

const categories = ref([])
const error = ref('')
const loading = ref(false)

const handleSubmit = async () => {
  error.value = ''
  loading.value = true
  
  try {
    const data = { ...formData.value }
    // Convert empty strings to null for optional fields
    Object.keys(data).forEach(key => {
      if (data[key] === '') data[key] = null
    })
    
    if (isEdit.value) {
      await itemStore.updateItem(route.params.id, data)
    } else {
      await itemStore.createItem(data)
    }
    
    router.push('/items')
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to save item'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await categoryStore.fetchCategories()
  categories.value = categoryStore.categories
  
  if (isEdit.value) {
    const item = await itemStore.fetchItem(route.params.id)
    Object.keys(formData.value).forEach(key => {
      if (item[key] !== null && item[key] !== undefined) {
        formData.value[key] = item[key]
      }
    })
    // Format dates
    if (item.purchaseDate) {
      formData.value.purchaseDate = item.purchaseDate.split('T')[0]
    }
    if (item.saleDate) {
      formData.value.saleDate = item.saleDate.split('T')[0]
    }
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

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.form-header h2 {
  font-size: 1.5rem;
}

@media (min-width: 769px) {
  .form-header {
    margin-bottom: 2rem;
  }
}

.item-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 769px) {
  .item-form {
    gap: 2rem;
  }
}

.form-section h3 {
  margin-bottom: 1rem;
  color: var(--text-primary);
  font-size: 1.0625rem;
}

@media (min-width: 769px) {
  .form-section h3 {
    font-size: 1.125rem;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 640px) {
  .form-row {
    grid-template-columns: 1fr 1fr;
  }
}

.form-actions {
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

@media (min-width: 640px) {
  .form-actions {
    flex-direction: row;
  }
}

.form-actions .btn {
  flex: 1;
}

.error-message {
  padding: 0.75rem;
  background-color: #FEE2E2;
  color: #DC2626;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

textarea.form-input {
  resize: vertical;
  font-family: inherit;
}
</style>
