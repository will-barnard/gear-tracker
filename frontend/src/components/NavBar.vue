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
          <AppIcon :name="isMenuOpen ? 'x' : 'menu'" :size="22" />
        </button>
        <router-link class="home-link" to="/" @click="closeMenu">
          <span class="mark" aria-hidden="true">GT</span>
          <span class="wordmark">Gear Tracker</span>
        </router-link>
      </div>

      <div class="nav-links" :class="{ 'nav-open': isMenuOpen }">
        <router-link to="/" @click="closeMenu" exact-active-class="active">Dashboard</router-link>
        <router-link to="/items" @click="closeMenu" :class="{ active: section === 'items' }">Items</router-link>
        <router-link to="/for-sale" @click="closeMenu" active-class="active">For sale</router-link>
        <router-link to="/bundles" @click="closeMenu" active-class="active">Bundles</router-link>
        <router-link to="/categories" @click="closeMenu" active-class="active">Categories</router-link>
        <div class="nav-bottom-actions">
          <router-link to="/settings" @click="closeMenu" class="icon-link" active-class="active" title="Settings">
            <AppIcon name="settings" :size="19" /><span class="label-mobile">Settings</span>
          </router-link>
          <button @click="handleLogout" class="icon-link" title="Log out">
            <AppIcon name="logout" :size="19" /><span class="label-mobile">Log out</span>
          </button>
        </div>
      </div>

      <router-link to="/items/new" class="btn btn-primary btn-sm add-btn" @click="closeMenu">
        <AppIcon name="plus" :size="16" /><span class="add-label">Add item</span>
      </router-link>

      <div class="nav-overlay" :class="{ 'overlay-visible': isMenuOpen }" @click="closeMenu"></div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppIcon from './AppIcon.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const isMenuOpen = ref(false)

// /items/:id should highlight Items, but /items/new shouldn't steal it from nowhere.
const section = computed(() => (route.path.startsWith('/items') ? 'items' : ''))

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
  document.body.style.overflow = isMenuOpen.value ? 'hidden' : ''
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
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 1001;
}
.navbar-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
}
@media (min-width: 769px) { .navbar-content { padding: 0 2rem; height: 60px; } }

.navbar-left { display: flex; align-items: center; gap: 0.5rem; }
.home-link {
  display: inline-flex; align-items: center; gap: 0.55rem;
  color: var(--text); text-decoration: none; font-weight: 700; letter-spacing: -0.01em;
}
.mark {
  width: 28px; height: 28px; border-radius: 7px;
  background: var(--text); color: var(--bg);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.7rem; font-weight: 800; letter-spacing: 0.02em;
}
.wordmark { font-size: 1rem; }

.hamburger-btn {
  display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; padding: 0; margin-left: -0.5rem;
  background: none; border: none; cursor: pointer; border-radius: var(--radius-sm);
  color: var(--text);
}
.hamburger-btn:hover { background: var(--surface-2); }

.add-btn { margin-left: auto; }
@media (max-width: 420px) { .add-label { display: none; } .add-btn { width: 40px; padding: 0; } }

/* Mobile: slide-in drawer */
.nav-links {
  position: fixed;
  top: 56px; left: 0; bottom: 0;
  width: min(280px, 82vw);
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  padding: 0.75rem;
  gap: 0.15rem;
  transform: translateX(-100%);
  transition: transform 0.22s ease;
  z-index: 1002;
  overflow-y: auto;
}
.nav-links.nav-open { transform: translateX(0); box-shadow: var(--shadow-lg); }
.nav-links a, .icon-link {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.7rem 0.8rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 550;
  font-size: 0.95rem;
  background: none; border: 0; cursor: pointer; text-align: left; width: 100%;
}
.nav-links a:hover, .icon-link:hover { background: var(--surface-2); color: var(--text); }
.nav-links a.active { color: var(--text); background: var(--surface-2); }
.nav-bottom-actions { margin-top: auto; padding-top: 0.75rem; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.15rem; }

.nav-overlay {
  position: fixed; top: 56px; left: 0; right: 0; bottom: 0;
  background: rgba(20, 18, 15, 0.4);
  opacity: 0; visibility: hidden; transition: opacity 0.2s;
  z-index: 1001;
}
.nav-overlay.overlay-visible { opacity: 1; visibility: visible; }

/* Desktop: inline links */
@media (min-width: 900px) {
  .hamburger-btn, .nav-overlay { display: none; }
  .nav-links {
    position: static; transform: none; width: auto; padding: 0; border: 0;
    flex-direction: row; align-items: center; background: none; gap: 0.15rem;
    overflow: visible; margin-left: 1rem; flex: 1;
  }
  .nav-links a { padding: 0.45rem 0.7rem; font-size: 0.875rem; width: auto; }
  .nav-bottom-actions { margin: 0 0 0 auto; padding: 0; border-top: 0; flex-direction: row; }
  .icon-link { width: 36px; height: 36px; padding: 0; justify-content: center; }
  .label-mobile { display: none; }
  .add-btn { margin-left: 0.25rem; }
}
</style>
