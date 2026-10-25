<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in notifyState.toasts" :key="t.id" class="toast" :class="t.type" role="status">
        <AppIcon :name="t.type === 'error' ? 'alert' : t.type === 'success' ? 'check' : 'info'" :size="16" />
        <span>{{ t.message }}</span>
        <button class="close" @click="dismiss(t.id)" aria-label="Dismiss"><AppIcon name="x" :size="14" /></button>
      </div>
    </TransitionGroup>
  </div>

  <div v-if="notifyState.confirm" class="modal-overlay" @click.self="notifyState.confirm.resolve(false)" @keydown.esc="notifyState.confirm.resolve(false)">
    <div class="modal" role="alertdialog" aria-modal="true" :aria-label="notifyState.confirm.title">
      <h3>{{ notifyState.confirm.title }}</h3>
      <p v-if="notifyState.confirm.message" class="muted">{{ notifyState.confirm.message }}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" @click="notifyState.confirm.resolve(false)">Cancel</button>
        <button
          ref="confirmBtn"
          class="btn"
          :class="notifyState.confirm.danger ? 'btn-danger-solid' : 'btn-primary'"
          @click="notifyState.confirm.resolve(true)"
        >{{ notifyState.confirm.confirmLabel }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'
import { notifyState, dismiss } from '@/composables/useNotify'

const confirmBtn = ref(null)
watch(() => notifyState.confirm, async (c) => {
  if (c) {
    await nextTick()
    confirmBtn.value?.focus()
  }
})
</script>

<style scoped>
.toasts {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 1200;
  width: min(92vw, 420px);
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 0.8rem;
  border-radius: var(--radius);
  background: var(--text);
  color: var(--bg);
  box-shadow: var(--shadow-lg);
  font-size: 0.875rem;
}
.toast > span { flex: 1; padding-top: 1px; }
.toast.error { background: var(--danger-strong); color: #fff; }
.toast.success { background: var(--success); color: #fff; }
.close { background: none; border: 0; color: inherit; opacity: 0.7; cursor: pointer; padding: 2px; }
.close:hover { opacity: 1; }
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
