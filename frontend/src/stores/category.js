import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref([])
  const loading = ref(false)
  
  const fetchCategories = async () => {
    loading.value = true
    try {
      const response = await api.get('/categories')
      categories.value = response.data
    } finally {
      loading.value = false
    }
  }
  
  const createCategory = async (categoryData) => {
    const response = await api.post('/categories', categoryData)
    categories.value.push(response.data)
    return response.data
  }
  
  const updateCategory = async (id, categoryData) => {
    const response = await api.put(`/categories/${id}`, categoryData)
    const index = categories.value.findIndex(cat => cat.id === id)
    if (index !== -1) {
      categories.value[index] = response.data
    }
    return response.data
  }
  
  const deleteCategory = async (id) => {
    await api.delete(`/categories/${id}`)
    categories.value = categories.value.filter(cat => cat.id !== id)
  }
  
  return {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  }
})
