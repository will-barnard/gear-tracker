<template>
  <div class="bundle-form-view">
    <NavBar />
    
    <div class="container">
      <div class="form-header">
        <h2>{{ isEdit ? 'Edit Bundle' : 'Add New Bundle' }}</h2>
        <router-link to="/bundles" class="btn btn-secondary">Cancel</router-link>
      </div>
      
      <form @submit.prevent="handleSubmit" class="bundle-form card">
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
          
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea
              v-model="formData.description"
              class="form-input"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="formData.status" class="form-input">
              <option value="active">Active</option>
              <option value="complete">Complete</option>
            </select>
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
        
        <div class="form-section">
          <h3>Additional Information</h3>
          
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
            {{ loading ? 'Saving...' : (isEdit ? 'Update Bundle' : 'Create Bundle') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBundleStore } from '@/stores/bundle'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()
const route = useRoute()
const bundleStore = useBundleStore()

const isEdit = computed(() => route.name === 'EditBundle')

const formData = ref({
  name: '',
  description: '',
  status: 'active',
  purchasePrice: '',
  purchaseDate: '',
  purchaseLocation: '',
  notes: ''
})

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
      await bundleStore.updateBundle(route.params.id, data)
    } else {
      await bundleStore.createBundle(data)
    }
    
    router.push('/bundles')
  } catch (err) {
    error.value = err.response?.data?.error || 'Failed to save bundle'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (isEdit.value) {
    const bundle = await bundleStore.fetchBundle(route.params.id)
    Object.keys(formData.value).forEach(key => {
      if (bundle[key] !== null && bundle[key] !== undefined) {
        formData.value[key] = bundle[key]
      }
    })
    // Format date
    if (bundle.purchaseDate) {
      formData.value.purchaseDate = bundle.purchaseDate.split('T')[0]
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

.bundle-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

@media (min-width: 769px) {
  .bundle-form {
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
