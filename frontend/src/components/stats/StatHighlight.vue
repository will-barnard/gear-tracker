<template>
  <div class="stat-highlight card" :class="[sizeClass, colorClass]">
    <p class="highlight-value">{{ displayValue }}</p>
    <p class="highlight-label">{{ label }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatCurrency } from '@/utils/statCalculations'

const props = defineProps({
  value: { type: Number, default: 0 },
  label: { type: String, required: true },
  format: { type: String, default: 'number', validator: v => ['number', 'currency', 'signed-currency'].includes(v) },
  size: { type: String, default: 'large', validator: v => ['large', 'small'].includes(v) },
  color: { type: String, default: 'default', validator: v => ['default', 'positive', 'negative', 'auto'].includes(v) }
})

const displayValue = computed(() => {
  if (props.format === 'currency') return formatCurrency(props.value)
  if (props.format === 'signed-currency') {
    const prefix = props.value >= 0 ? '+' : ''
    return prefix + formatCurrency(props.value)
  }
  return props.value.toLocaleString()
})

const sizeClass = computed(() => `size-${props.size}`)

const colorClass = computed(() => {
  if (props.color === 'auto') return props.value >= 0 ? 'color-positive' : 'color-negative'
  if (props.color !== 'default') return `color-${props.color}`
  return ''
})
</script>

<style scoped>
.stat-highlight {
  text-align: center;
  padding: 1rem 0.75rem;
}

.size-large .highlight-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.size-small .highlight-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.highlight-value {
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
  word-break: break-word;
}

.highlight-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 500;
}

.color-positive .highlight-value {
  color: var(--success-color);
}

.color-negative .highlight-value {
  color: var(--danger-color);
}

@media (min-width: 480px) {
  .stat-highlight {
    padding: 1.25rem 1rem;
  }

  .size-large .highlight-value {
    font-size: 2rem;
  }

  .size-small .highlight-value {
    font-size: 1.5rem;
  }
}

@media (min-width: 640px) {
  .stat-highlight {
    padding: 1.5rem;
  }

  .size-large .highlight-value {
    font-size: 2.5rem;
  }

  .size-small .highlight-value {
    font-size: 1.75rem;
  }

  .highlight-label {
    font-size: 0.8125rem;
  }
}
</style>
