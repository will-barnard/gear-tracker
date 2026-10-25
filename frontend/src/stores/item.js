import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useItemStore = defineStore('item', () => {
  const items = ref([])
  const currentItem = ref(null)
  const loading = ref(false)
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0
  })
  
  // Only the latest request's response is applied: typing in search fires a
  // request per pause, and a slow early response mustn't overwrite a later one.
  let requestSeq = 0
  const fetchItems = async (filters = {}) => {
    const seq = ++requestSeq
    loading.value = true
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v != null))
      const response = await api.get('/items', { params })
      if (seq !== requestSeq) return
      items.value = response.data.items
      pagination.value = response.data.pagination
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  }
  
  const fetchItem = async (id) => {
    loading.value = true
    try {
      const response = await api.get(`/items/${id}`)
      currentItem.value = response.data
      return response.data
    } finally {
      loading.value = false
    }
  }
  
  const createItem = async (itemData) => {
    const response = await api.post('/items', itemData)
    return response.data
  }
  
  const updateItem = async (id, itemData) => {
    const response = await api.put(`/items/${id}`, itemData)
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value[index] = response.data
    }
    return response.data
  }
  
  const deleteItem = async (id) => {
    await api.delete(`/items/${id}`)
    items.value = items.value.filter(item => item.id !== id)
  }
  
  const getStats = async () => {
    const response = await api.get('/items/stats/summary')
    return response.data
  }

  const getStatsDetail = async () => {
    const response = await api.get('/items/stats/detail')
    return response.data
  }
  
  return {
    items,
    currentItem,
    loading,
    pagination,
    fetchItems,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
    getStats,
    getStatsDetail
  }
})
