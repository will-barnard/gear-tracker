<template>
  <AuthShell title="Create your account">
    <div v-if="open === null" class="loading-block"><div class="spinner"></div></div>

    <template v-else-if="!open">
      <p class="muted">Sign-up is closed on this server — it already has its owner account.</p>
      <router-link to="/login" class="btn btn-primary btn-block" style="margin-top: 1.25rem">Go to log in</router-link>
    </template>

    <form v-else @submit.prevent="handleRegister">
      <div class="form-group">
        <label class="form-label">Email</label>
        <input v-model="formData.email" type="email" class="form-input" autocomplete="email" required />
      </div>
      <div class="form-group">
        <label class="form-label">Username</label>
        <input v-model="formData.username" type="text" class="form-input" autocomplete="username" minlength="3" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">First name</label>
          <input v-model="formData.firstName" type="text" class="form-input" autocomplete="given-name" />
        </div>
        <div class="form-group">
          <label class="form-label">Last name</label>
          <input v-model="formData.lastName" type="text" class="form-input" autocomplete="family-name" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Password</label>
        <input v-model="formData.password" type="password" class="form-input" autocomplete="new-password" minlength="6" required />
      </div>
      <div class="form-group">
        <label class="form-label">Confirm password</label>
        <input v-model="confirmPassword" type="password" class="form-input" autocomplete="new-password" required />
      </div>
      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
        {{ loading ? 'Creating account…' : 'Create account' }}
      </button>
      <p class="foot">The first account on this server is the owner; sign-up closes after it.</p>
    </form>
    <p v-if="open" class="foot">Already have an account? <router-link to="/login">Log in</router-link></p>
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

const formData = ref({ email: '', username: '', firstName: '', lastName: '', password: '' })
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const open = ref(null)

const handleRegister = async () => {
  error.value = ''
  if (formData.value.password !== confirmPassword.value) {
    error.value = "Passwords don't match"
    return
  }
  loading.value = true
  try {
    await authStore.register(formData.value)
    router.push('/')
  } catch (err) {
    error.value = errorMessage(err, 'Registration failed')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    open.value = (await api.get('/auth/registration')).data.open
  } catch {
    open.value = true // let the server decide on submit
  }
})
</script>
