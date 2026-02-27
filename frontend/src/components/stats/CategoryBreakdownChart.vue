<template>
  <div class="chart-wrapper card">
    <h3 v-if="title" class="chart-title">{{ title }}</h3>
    <div class="doughnut-layout">
      <div class="chart-canvas-container">
        <Doughnut :data="chartData" :options="mergedOptions" />
      </div>
      <div v-if="showLegend" class="custom-legend">
        <div
          v-for="(label, i) in chartData.labels"
          :key="label"
          class="legend-item"
        >
          <span class="legend-swatch" :style="{ backgroundColor: chartData.datasets[0].backgroundColor[i] }"></span>
          <span class="legend-label">{{ label }}</span>
          <span class="legend-value">{{ formatLegendValue(chartData.datasets[0].data[i]) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  chartData: { type: Object, required: true },
  title: { type: String, default: '' },
  valueFormat: { type: String, default: 'number', validator: v => ['number', 'currency'].includes(v) },
  showLegend: { type: Boolean, default: true }
})

const mergedOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '60%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleFont: { size: 13 },
      bodyFont: { size: 13 },
      padding: 10,
      callbacks: {
        label: (ctx) => {
          const val = ctx.parsed
          if (props.valueFormat === 'currency') {
            return `${ctx.label}: $${val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
          }
          return `${ctx.label}: ${val.toLocaleString()}`
        }
      }
    }
  }
}))

function formatLegendValue(val) {
  if (props.valueFormat === 'currency') {
    return '$' + val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  return val.toLocaleString()
}
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

.doughnut-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.chart-canvas-container {
  position: relative;
  height: 160px;
  max-width: 200px;
  margin: 0 auto;
}

.custom-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  justify-content: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: var(--background);
  border-radius: 0.25rem;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
}

.legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-value {
  color: var(--text-secondary);
  font-weight: 600;
  flex-shrink: 0;
}

@media (min-width: 480px) {
  .chart-canvas-container {
    height: 180px;
    max-width: 220px;
  }

  .legend-item {
    font-size: 0.8125rem;
  }
}

@media (min-width: 640px) {
  .chart-wrapper {
    padding: 1.5rem;
  }

  .doughnut-layout {
    flex-direction: row;
    align-items: center;
  }

  .chart-canvas-container {
    height: 220px;
    min-width: 220px;
    max-width: none;
  }

  .custom-legend {
    flex-direction: column;
    justify-content: flex-start;
  }
}
</style>
