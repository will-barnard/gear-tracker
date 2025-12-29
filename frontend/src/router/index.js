import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('@/views/DashboardView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/items',
      name: 'Items',
      component: () => import('@/views/ItemsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/items/new',
      name: 'NewItem',
      component: () => import('@/views/ItemFormView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/items/:id',
      name: 'ItemDetail',
      component: () => import('@/views/ItemDetailView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/items/:id/edit',
      name: 'EditItem',
      component: () => import('@/views/ItemFormView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/categories',
      name: 'Categories',
      component: () => import('@/views/CategoriesView.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next('/')
  } else {
    next()
  }
})

export default router
