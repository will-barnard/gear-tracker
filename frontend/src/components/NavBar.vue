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
        <router-link class="home-link"to="/" @click="closeMenu">
          <h1>🎸 Gear Tracker</h1>
        </router-link>
      </div>
      
      <div class="nav-links" :class="{ 'nav-open': isMenuOpen }">
        foo
        <router-link to="/" @click="closeMenu">Dashboard</router-link>
        <router-link to="/items" @click="closeMenu">Items</router-link>
        <router-link to="/for-sale" @click="closeMenu">For Sale</router-link>
        <router-link to="/bundles" @click="closeMenu">Bundles</router-link>
        <router-link to="/categories" @click="closeMenu">Categories</router-link>
        <div class="nav-bottom-actions">
          <router-link to="/settings" @click="closeMenu" class="settings-link" title="Settings">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </router-link>
          <button @click="handleLogout" class="btn btn-secondary">Logout</button>
        </div>
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

.home-link {
  text-decoration: none;
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

.nav-bottom-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-top: auto;
}

.nav-bottom-actions .btn {
  font-size: 1rem;
  flex: 1;
}

.settings-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 0.375rem;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.settings-link:hover {
  background-color: var(--background);
  color: var(--text-primary);
}

.settings-link.router-link-active {
  color: var(--primary-color);
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
  
  .nav-bottom-actions {
    margin-top: 0;
    gap: 0.5rem;
  }

  .nav-bottom-actions .btn {
    flex: initial;
    font-size: 0.875rem;
    padding: 0.5rem 0.75rem;
  }

  .settings-link {
    width: 36px;
    height: 36px;
  }
  
  .nav-overlay {
    display: none !important;
  }
}
</style>
