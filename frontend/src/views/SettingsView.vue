<template>
  <div>
    <NavBar />
    <main class="page settings-page">
      <div class="page-header"><h2>Settings</h2></div>

      <section class="card">
        <div class="card-head">
          <h3><AppIcon name="database" :size="17" /> Backups</h3>
          <button v-if="sys?.configured" class="btn btn-secondary btn-sm" :disabled="backingUp" @click="backupNow">
            {{ backingUp ? 'Backing up…' : 'Back up now' }}
          </button>
        </div>
        <div v-if="sysLoading" class="small muted">Checking…</div>
        <template v-else-if="sys">
          <p v-if="sys.configured" class="small muted">
            Every night at {{ hourLabel }} ({{ sys.timezone }}) the whole database is dumped to brew-bucket's <code>{{ sys.bucket }}</code> bucket, which keeps 90 days.
          </p>
          <p v-else class="alert alert-warn">
            Nightly backups are off. Set <code>BACKUP_BREW_BUCKET_KEY</code> on the backend (a brew-bucket key with read + write on the <code>backups</code> bucket) to turn them on.
          </p>
          <div v-if="sys.last && !sys.last.ok" class="alert alert-error" style="margin-top: 0.75rem">Last attempt failed: {{ sys.last.error }}</div>
          <div v-if="sys.listError" class="alert alert-warn" style="margin-top: 0.75rem">{{ sys.listError }}</div>
          <ul v-if="sys.recent?.length" class="backup-list">
            <li v-for="b in sys.recent" :key="b.key">
              <span class="mono small">{{ b.key.split('/').pop() }}</span>
              <span class="small faint">{{ fileSize(b.size) }}</span>
            </li>
          </ul>
        </template>
        <p v-else class="small muted">Only the owner account can see backups.</p>
      </section>

      <section class="card">
        <h3><AppIcon name="image" :size="17" /> File storage</h3>
        <p v-if="sys?.storage?.configured" class="small muted">
          Photos and files are stored in brew-bucket (<code>{{ sys.storage.bucket }}/{{ sys.storage.prefix }}/</code>). If the NAS is asleep, images show as blank and uploads ask you to retry.
        </p>
        <p v-else-if="sys" class="alert alert-warn">
          Uploads are off. Set <code>BREW_BUCKET_URL</code> and <code>BREW_BUCKET_KEY</code> (read, write and delete on the <code>uploads</code> bucket) on the backend.
        </p>
      </section>

      <section class="card">
        <h3><AppIcon name="download" :size="17" /> Export</h3>
        <p class="small muted">All items, categories, bundles and costs as JSON, plus a list of attached files. The files themselves stay in brew-bucket.</p>
        <button @click="downloadData" class="btn btn-secondary" :disabled="exporting" style="margin-top: 0.85rem">
          {{ exporting ? 'Exporting…' : 'Download export' }}
        </button>
      </section>

      <section class="card">
        <h3><AppIcon name="upload" :size="17" /> Import</h3>
        <p class="small muted">Load a previous export. Categories and bundles with matching names are reused; items are always added (so importing the same file twice duplicates them). Files aren't restored.</p>
        <div class="upload-row">
          <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="handleFileSelect" />
          <button @click="fileInput.click()" class="btn btn-secondary">Choose file</button>
          <span v-if="selectedFile" class="small">{{ selectedFile.name }}</span>
          <button v-if="selectedFile" @click="uploadData" class="btn btn-primary" :disabled="importing">{{ importing ? 'Importing…' : 'Import' }}</button>
        </div>
        <div v-if="importError" class="alert alert-error" style="margin-top: 0.75rem">{{ importError }}</div>
        <div v-if="importResult" class="alert alert-success" style="margin-top: 0.75rem">
          Imported {{ importResult.items }} items, {{ importResult.additionalCosts }} costs, {{ importResult.categories }} new categories and {{ importResult.bundles }} new bundles.
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import AppIcon from '@/components/AppIcon.vue'
import api from '@/services/api'
import { fileSize, errorMessage } from '@/utils/format'
import { toastError, toastSuccess } from '@/composables/useNotify'

const sys = ref(null)
const sysLoading = ref(true)
const backingUp = ref(false)
const exporting = ref(false)
const selectedFile = ref(null)
const importing = ref(false)
const importError = ref('')
const importResult = ref(null)
const fileInput = ref(null)

const hourLabel = computed(() => {
  const h = sys.value?.hour ?? 3
  return new Date(2000, 0, 1, h).toLocaleTimeString('en-US', { hour: 'numeric' })
})

async function loadSys() {
  try {
    sys.value = (await api.get('/data/backups')).data
  } catch (err) {
    if (err.response?.status !== 403) toastError(errorMessage(err, "Couldn't check backup status"))
  } finally {
    sysLoading.value = false
  }
}

async function backupNow() {
  backingUp.value = true
  try {
    await api.post('/data/backups')
    toastSuccess('Backup saved')
    await loadSys()
  } catch (err) {
    toastError(errorMessage(err, 'Backup failed'))
  } finally {
    backingUp.value = false
  }
}

const downloadData = async () => {
  exporting.value = true
  try {
    const response = await api.get('/data/export')
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const d = new Date()
    a.download = `gear-tracker-export-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    toastError(errorMessage(err, 'Failed to export data'))
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
    let data
    try {
      data = JSON.parse(await selectedFile.value.text())
    } catch {
      importError.value = "That file isn't valid JSON"
      return
    }
    const response = await api.post('/data/import', data)
    importResult.value = response.data.stats
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (err) {
    importError.value = errorMessage(err, 'Failed to import data')
  } finally {
    importing.value = false
  }
}

onMounted(loadSys)
</script>

<style scoped>
.settings-page { max-width: 760px; }
.settings-page .card { margin-bottom: 1rem; }
.settings-page h3 { display: flex; align-items: center; gap: 0.5rem; }
.card-head h3 { margin: 0; }
code { font-family: var(--font-mono); font-size: 0.8em; background: var(--surface-2); padding: 0.05rem 0.3rem; border-radius: 4px; }
.mono { font-family: var(--font-mono); }
.upload-row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.85rem; }
.backup-list { margin-top: 0.75rem; border-top: 1px solid var(--border); }
.backup-list li { display: flex; justify-content: space-between; padding: 0.45rem 0; border-bottom: 1px solid var(--border); }
</style>
