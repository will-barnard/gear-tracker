<template>
  <div class="register-container">
    <div class="register-card card">
      <h1>Create Account</h1>
      
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input
            v-model="formData.email"
            type="email"
            class="form-input"
            required
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Username</label>
          <input
            v-model="formData.username"
            type="text"
            class="form-input"
            required
            minlength="3"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">First Name</label>
          <input
            v-model="formData.firstName"
            type="text"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Last Name</label>
          <input
            v-model="formData.lastName"
            type="text"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Password</label>
          <input
            v-model="formData.password"
            type="password"
            class="form-input"
            required
            minlength="6"
          />
        </div>
        
        <div class="form-group">
          <label class="form-label">Confirm Password</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="form-input"
            required
          />
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Creating account...' : 'Register' }}
        </button>
      </form>
      
      <p class="login-link">
        Already have an account? <router-link to="/login">Login</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref({
  email: '',
  username: '',
  firstName: '',
  lastName: '',
  password: ''
})
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)

const handleRegister = async () => {
  error.value = ''
  
  if (formData.value.password !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }
  
  loading.value = true
  
  try {
    await authStore.register(formData.value)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.error || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
}

.register-card {
  width: 100%;
  max-width: 500px;
}

.register-card h1 {
  margin-bottom: 1.5rem;
  text-align: center;
  color: var(--text-primary);
}

.error-message {
  padding: 0.75rem;
  margin-bottom: 1rem;
  background-color: #FEE2E2;
  color: #DC2626;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.btn {
  width: 100%;
  margin-top: 0.5rem;
}

.login-link {
  margin-top: 1rem;
  text-align: center;
  font-size: 0.875rem;
}

.login-link a {
  color: var(--primary-color);
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>
