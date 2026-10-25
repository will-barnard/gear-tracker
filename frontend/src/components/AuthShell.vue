<template>
  <main class="auth">
    <div class="auth-card card">
      <div class="brand"><span class="mark">GT</span> Gear Tracker</div>
      <h1>{{ title }}</h1>
      <slot />
    </div>
  </main>
</template>

<script setup>
defineProps({ title: { type: String, required: true } })
</script>

<style scoped>
.auth { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.auth-card { width: 100%; max-width: 400px; padding: 1.75rem; }
.brand { display: flex; align-items: center; gap: 0.55rem; font-weight: 700; margin-bottom: 1.5rem; }
.mark {
  width: 28px; height: 28px; border-radius: 7px; background: var(--text); color: var(--bg);
  display: inline-flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800;
}
h1 { font-size: 1.35rem; margin-bottom: 1.25rem; }
:slotted(.btn-block) { margin-top: 0.5rem; }
:slotted(.foot) { margin-top: 1.25rem; text-align: center; font-size: 0.875rem; color: var(--text-muted); }
</style>
