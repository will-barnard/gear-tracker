<template>
  <div class="chart-wrapper card">
    <h3 v-if="title" class="chart-title">{{ title }}</h3>
    <div class="chart-canvas-container">
      <Line :data="chartData" :options="mergedOptions" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps({
  chartData: { type: Object, required: true },
  title: { type: String, default: '' },
  yFormat: { type: String, default: 'number', validator: v => ['number', 'currency'].includes(v) }
})

const isMobile = computed(() => typeof window !== 'undefined' && window.innerWidth < 640)

const mergedOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: { size: 12 },
      bodyFont: { size: 12 },
      padding: 8,
      callbacks: {
        label: (ctx) => {
          const val = ctx.parsed.y
          if (props.yFormat === 'currency') {
            return `${ctx.dataset.label}: $${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
          }
          return `${ctx.dataset.label}: ${val.toLocaleString()}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        font: { size: isMobile.value ? 9 : 11 },
        color: '#6B7280',
        maxRotation: isMobile.value ? 60 : 45,
        autoSkip: true,
        maxTicksLimit: isMobile.value ? 6 : 12
      }
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0, 0, 0, 0.05)' },
      ticks: {
        font: { size: isMobile.value ? 9 : 11 },
        color: '#6B7280',
        maxTicksLimit: isMobile.value ? 5 : 8,
        callback: (val) => {
          if (props.yFormat === 'currency') {
            if (isMobile.value && val >= 1000) {
              return '$' + (val / 1000).toFixed(1) + 'k'
            }
            return '$' + val.toLocaleString()
          }
          return val.toLocaleString()
        }
      }
    }
  }
}))
</script>

<style scoped>
.chart-wrapper {
  padding: 1.25rem 1rem;
}

.chart-title {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 1rem 0;
  font-weight: 600;
}

.chart-canvas-container {
  position: relative;
  height: 200px;
}

@media (min-width: 480px) {
  .chart-canvas-container {
    height: 220px;
  }
}

@media (min-width: 640px) {
  .chart-wrapper {
    padding: 1.5rem;
  }

  .chart-canvas-container {
    height: 280px;
  }
}

@media (min-width: 1024px) {
  .chart-canvas-container {
    height: 300px;
  }
}
</style>
