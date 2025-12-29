<template>
  <nav class="navbar">
    <div class="navbar-content">
      <div class="navbar-left">
        <button 
          class="hamburger-btn" 
          @click="toggleMenu"
          :aria-label="isMenuOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="isMenuOpen"
        >
          <span class="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        <h1>🎸 Gear Tracker</h1>
      </div>
      
      <div class="nav-links" :class="{ 'nav-open': isMenuOpen }">
        <router-link to="/" @click="closeMenu">Dashboard</router-link>
        <router-link to="/items" @click="closeMenu">Items</router-link>
        <router-link to="/categories" @click="closeMenu">Categories</router-link>
        <button @click="handleLogout" class="btn btn-secondary">Logout</button>
      </div>
      
      <div 
        class="nav-overlay" 
        :class="{ 'overlay-visible': isMenuOpen }"
        @click="closeMenu"
      ></div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
  // Prevent body scroll when menu is open
  if (isMenuOpen.value) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

const closeMenu = () => {
  isMenuOpen.value = false
  document.body.style.overflow = ''
}

const handleLogout = () => {
  closeMenu()
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.navbar {
  background: white;
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 1001;
}

.navbar-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.navbar h1 {
  font-size: 1.25rem;
  color: var(--text-primary);
  margin: 0;
}

.hamburger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.hamburger-btn:hover {
  background-color: var(--background);
}

.hamburger-btn:active {
  background-color: var(--border-color);
}

.hamburger-icon {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 24px;
}

.hamburger-icon span {
  display: block;
  height: 2px;
  background-color: var(--text-primary);
  border-radius: 2px;
  transition: all 0.3s ease;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
  position: fixed;
  top: 0;
  left: -100%;
  width: 280px;
  max-width: 85vw;
  height: 100vh;
  background: white;
  flex-direction: column;
  padding: 2rem 1rem;
  padding-top: calc(73px + 2rem);
  align-items: stretch;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  transition: left 0.3s ease;
  overflow-y: auto;
  z-index: 1002;
}

.nav-links.nav-open {
  left: 0;
}

.nav-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  font-size: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
  display: block;
}

.nav-links a:hover {
  background-color: var(--background);
  color: var(--text-primary);
}

.nav-links a.router-link-active {
  background-color: #DBEAFE;
  color: var(--primary-color);
  font-weight: 600;
}

.nav-links .btn {
  font-size: 1rem;
  width: 100%;
  margin-top: auto;
}

.nav-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.nav-overlay.overlay-visible {
  display: block;
  opacity: 1;
}

@media (min-width: 769px) {
  .hamburger-btn {
    display: none;
  }
  
  .navbar h1 {
    font-size: 1.5rem;
  }
  
  .navbar-content {
    padding: 0 2rem;
  }
  
  .nav-links {
    position: static;
    width: auto;
    max-width: none;
    height: auto;
    flex-direction: row;
    padding: 0;
    box-shadow: none;
    background: transparent;
    gap: 1.5rem;
  }
  
  .nav-links a {
    padding: 0.5rem;
    font-size: 1rem;
  }
  
  .nav-links a:hover {
    background-color: transparent;
  }
  
  .nav-links a.router-link-active {
    background-color: transparent;
  }
  
  .nav-links .btn {
    width: auto;
    margin-top: 0;
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
  }
  
  .nav-overlay {
    display: none !important;
  }
}
</style>
