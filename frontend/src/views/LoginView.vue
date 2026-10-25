<template>
  <AuthShell title="Log in">
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label class="form-label" for="email">Email</label>
        <input id="email" v-model="email" type="email" class="form-input" autocomplete="email" required autofocus />
      </div>
      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <input id="password" v-model="password" type="password" class="form-input" autocomplete="current-password" required />
      </div>
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
        {{ loading ? 'Logging in…' : 'Log in' }}
      </button>
    </form>
    <p v-if="registrationOpen" class="foot">
      No account yet? <router-link to="/register">Create one</router-link>
    </p>
  </AuthShell>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthShell from '@/components/AuthShell.vue'
import api from '@/services/api'
import { errorMessage } from '@/utils/format'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const registrationOpen = ref(false)

const handleLogin = async () => {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = errorMessage(err, 'Login failed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    registrationOpen.value = (await api.get('/auth/registration')).data.open
  } catch {
    registrationOpen.value = false
  }
})
</script>
