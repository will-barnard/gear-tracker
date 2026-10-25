<template>
  <router-view />
  <NotifyHost />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import NotifyHost from '@/components/NotifyHost.vue'

const authStore = useAuthStore()

onMounted(() => {
  authStore.checkAuth()
})
</script>
