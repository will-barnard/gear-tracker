// Toasts and confirm dialogs, replacing window.alert/confirm. Rendered once by
// <NotifyHost> in App.vue; any component can call these.
import { reactive } from 'vue'

export const notifyState = reactive({ toasts: [], confirm: null })
let seq = 0

export function toast(message, { type = 'info', timeout = 4000 } = {}) {
  const id = ++seq
  notifyState.toasts.push({ id, message, type })
  if (timeout) setTimeout(() => dismiss(id), timeout)
  return id
}

export const toastError = (message) => toast(message, { type: 'error', timeout: 7000 })
export const toastSuccess = (message) => toast(message, { type: 'success' })

export function dismiss(id) {
  const i = notifyState.toasts.findIndex((t) => t.id === id)
  if (i !== -1) notifyState.toasts.splice(i, 1)
}

// Resolves true/false. `danger` styles the confirm button as destructive.
export function confirmAction({ title = 'Are you sure?', message = '', confirmLabel = 'Confirm', danger = false } = {}) {
  return new Promise((resolve) => {
    notifyState.confirm = {
      title, message, confirmLabel, danger,
      resolve: (v) => {
        notifyState.confirm = null
        resolve(v)
      }
    }
  })
}
