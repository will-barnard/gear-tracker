<template>
  <div class="stat-page-header">
    <router-link to="/" class="back-link">← Dashboard</router-link>
    <h2>{{ title }}</h2>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' }
})
</script>

<style scoped>
.stat-page-header {
  margin-bottom: 1.5rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0;
  min-height: 44px;
  transition: opacity 0.15s;
}

.back-link:hover {
  opacity: 0.8;
}

.stat-page-header h2 {
  color: var(--text-primary);
  font-size: 1.25rem;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  margin: 0;
  line-height: 1.4;
}

@media (min-width: 640px) {
  .stat-page-header h2 {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.875rem;
  }
}

@media (min-width: 769px) {
  .stat-page-header {
    margin-bottom: 2rem;
  }

  .stat-page-header h2 {
    font-size: 1.75rem;
  }
}
</style>
