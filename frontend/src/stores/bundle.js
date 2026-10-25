import { defineStore } from 'pinia'
import api from '@/services/api'
import { errorMessage } from '@/utils/format'

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
    async run(fn, fallback) {
      this.error = null
      try {
        return await fn()
      } catch (error) {
        this.error = errorMessage(error, fallback)
        throw error
      }
    },

    async fetchBundles() {
      this.loading = true
      try {
        return await this.run(async () => {
          const response = await api.get('/bundles')
          this.bundles = response.data
          return response.data
        }, 'Failed to fetch bundles')
      } finally {
        this.loading = false
      }
    },

    // Detail includes items (with costing), stats and attachments.
    async fetchBundle(id) {
      return this.run(async () => {
        const response = await api.get(`/bundles/${id}`)
        this.currentBundle = response.data
        return response.data
      }, 'Failed to fetch bundle')
    },

    async createBundle(bundleData) {
      return this.run(async () => {
        const response = await api.post('/bundles', bundleData)
        this.bundles.unshift(response.data)
        return response.data
      }, 'Failed to create bundle')
    },

    async updateBundle(id, bundleData) {
      return this.run(async () => {
        const response = await api.put(`/bundles/${id}`, bundleData)
        const index = this.bundles.findIndex(b => b.id === id)
        if (index !== -1) this.bundles[index] = { ...this.bundles[index], ...response.data }
        if (this.currentBundle?.id === id) this.currentBundle = response.data
        return response.data
      }, 'Failed to update bundle')
    },

    async deleteBundle(id) {
      return this.run(async () => {
        await api.delete(`/bundles/${id}`)
        this.bundles = this.bundles.filter(b => b.id !== id)
        if (this.currentBundle?.id === id) this.currentBundle = null
      }, 'Failed to delete bundle')
    },

    async rebalanceBundle(id) {
      return this.run(async () => {
        const response = await api.post(`/bundles/${id}/rebalance`)
        this.currentBundle = response.data
        return response.data
      }, 'Failed to rebalance bundle')
    },

    async resetBalance(id) {
      return this.run(async () => {
        const response = await api.delete(`/bundles/${id}/rebalance`)
        this.currentBundle = response.data
        return response.data
      }, 'Failed to reset bundle split')
    }
  }
})
