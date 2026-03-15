<template>
  <div class="settings-view">
    <NavBar />
    
    <div class="container">
      <h2>Settings</h2>

      <div class="card settings-card">
        <h3>Download Data</h3>
        <p>Export all your items, categories, bundles, and additional costs as a JSON file.</p>
        <button @click="downloadData" class="btn btn-primary" :disabled="exporting">
          {{ exporting ? 'Exporting...' : 'Download Data' }}
        </button>
        <p v-if="exportError" class="error-message">{{ exportError }}</p>
      </div>

      <div class="card settings-card">
        <h3>Upload Data</h3>
        <p>Import data from a previously exported JSON file. Categories and bundles with matching names will be skipped. Items are always added.</p>
        <div class="upload-area">
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            class="file-input"
            @change="handleFileSelect"
          />
          <button @click="$refs.fileInput.click()" class="btn btn-secondary">
            Choose File
          </button>
          <span class="file-name" v-if="selectedFile">{{ selectedFile.name }}</span>
        </div>
        <button
          @click="uploadData"
          class="btn btn-primary"
          :disabled="!selectedFile || importing"
          style="margin-top: 0.75rem;"
        >
          {{ importing ? 'Importing...' : 'Upload Data' }}
        </button>
        <p v-if="importError" class="error-message">{{ importError }}</p>
        <div v-if="importResult" class="success-message">
          <strong>Import complete!</strong>
          <ul>
            <li>{{ importResult.categories }} categories added</li>
            <li>{{ importResult.bundles }} bundles added</li>
            <li>{{ importResult.items }} items added</li>
            <li>{{ importResult.additionalCosts }} additional costs added</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NavBar from '@/components/NavBar.vue'
import api from '@/services/api'

const exporting = ref(false)
const exportError = ref('')
const selectedFile = ref(null)
const importing = ref(false)
const importError = ref('')
const importResult = ref(null)
const fileInput = ref(null)

const downloadData = async () => {
  exporting.value = true
  exportError.value = ''
  try {
    const response = await api.get('/data/export')
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gear-tracker-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    exportError.value = error.response?.data?.error || 'Failed to export data'
  } finally {
    exporting.value = false
  }
}

const handleFileSelect = (event) => {
  selectedFile.value = event.target.files[0] || null
  importResult.value = null
  importError.value = ''
}

const uploadData = async () => {
  if (!selectedFile.value) return
  importing.value = true
  importError.value = ''
  importResult.value = null

  try {
    const text = await selectedFile.value.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      importError.value = 'Invalid JSON file'
      return
    }
    const response = await api.post('/data/import', data)
    importResult.value = response.data.stats
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (error) {
    importError.value = error.response?.data?.error || 'Failed to import data'
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

@media (min-width: 769px) {
  .container {
    padding: 2rem;
  }
}

h2 {
  margin-bottom: 1.5rem;
}

.settings-card {
  margin-bottom: 1.5rem;
}

.settings-card h3 {
  margin-bottom: 0.5rem;
}

.settings-card p {
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-input {
  display: none;
}

.file-name {
  font-size: 0.875rem;
  color: var(--text-secondary);
  word-break: break-all;
}

.error-message {
  padding: 0.75rem;
  background-color: #FEE2E2;
  color: #DC2626;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

.success-message {
  padding: 0.75rem;
  background-color: #D1FAE5;
  color: #065F46;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

.success-message ul {
  margin: 0.5rem 0 0 1.25rem;
  padding: 0;
}

.success-message li {
  margin-bottom: 0.25rem;
}
</style>
