import { defineStore } from 'pinia'
import api from '@/services/api'

export const useBundleStore = defineStore('bundle', {
  state: () => ({
    bundles: [],
    currentBundle: null,
    loading: false,
    error: null
  }),

  getters: {
    activeBundles: (state) => state.bundles.filter(b => b.status === 'active'),
    completeBundles: (state) => state.bundles.filter(b => b.status === 'complete')
  },

  actions: {
    async fetchBundles() {
      this.loading = true
      this.error = null
      try {
        const response = await api.get('/bundles')
        this.bundles = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to fetch bundles'
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchBundle(id) {
      this.loading = true
      this.error = null
      try {
        const response = await api.get(`/bundles/${id}`)
        this.currentBundle = response.data
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to fetch bundle'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createBundle(bundleData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.post('/bundles', bundleData)
        this.bundles.unshift(response.data)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to create bundle'
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateBundle(id, bundleData) {
      this.loading = true
      this.error = null
      try {
        const response = await api.put(`/bundles/${id}`, bundleData)
        const index = this.bundles.findIndex(b => b.id === id)
        if (index !== -1) {
          this.bundles[index] = response.data
        }
        if (this.currentBundle?.id === id) {
          this.currentBundle = response.data
        }
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to update bundle'
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteBundle(id) {
      this.loading = true
      this.error = null
      try {
        await api.delete(`/bundles/${id}`)
        this.bundles = this.bundles.filter(b => b.id !== id)
        if (this.currentBundle?.id === id) {
          this.currentBundle = null
        }
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to delete bundle'
        throw error
      } finally {
        this.loading = false
      }
    },

    async getBundleStats(id) {
      try {
        const response = await api.get(`/bundles/${id}/stats`)
        return response.data
      } catch (error) {
        this.error = error.response?.data?.error || 'Failed to fetch bundle stats'
        throw error
      }
    }
  }
})
