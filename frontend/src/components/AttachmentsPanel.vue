<template>
  <div
    class="attachments"
    :class="{ dragging: dropActive, wide }"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Photos -->
    <section v-if="show !== 'documents'" class="card photos-card">
      <div class="card-head">
        <h3>Photos <span v-if="photos.length" class="count">{{ photos.length }}</span></h3>
        <button class="btn btn-secondary btn-sm" @click="photoInput.click()">
          <AppIcon name="camera" :size="16" /> Add photos
        </button>
        <input ref="photoInput" type="file" accept="image/*" multiple hidden @change="pick($event, 'photo')" />
      </div>

      <div v-if="photos.length || photoQueue.length" class="photo-grid" :class="{ 'has-cover': photos.length > 0 }">
        <figure
          v-for="(p, i) in photos"
          :key="p.id"
          class="photo"
          :class="{ cover: i === 0, over: dragOverId === p.id }"
          :draggable="canReorder"
          @dragstart="dragStart($event, p)"
          @dragover.prevent="dragOverId = p.id"
          @dragleave="dragOverId = null"
          @drop.stop.prevent="dropOn(p)"
          @dragend="dragId = dragOverId = null"
        >
          <button class="photo-open" @click="openAt(i)" :aria-label="`Open photo ${i + 1}`">
            <img :src="fileUrl(i === 0 ? p.urls.original : p.urls.thumb)" :alt="p.caption || p.filename" loading="lazy" />
          </button>
          <span v-if="i === 0" class="badge cover-badge">Cover</span>
          <div class="photo-actions">
            <button v-if="i > 0" class="mini" title="Make cover" @click="makeCover(p)"><AppIcon name="star" :size="14" /></button>
            <button class="mini" title="Delete" @click="remove(p)"><AppIcon name="trash" :size="14" /></button>
          </div>
          <figcaption v-if="p.caption">{{ p.caption }}</figcaption>
        </figure>

        <div v-for="u in photoQueue" :key="u.id" class="photo pending" :class="{ failed: u.status === 'error' }">
          <img v-if="u.preview" :src="u.preview" alt="" />
          <div class="pending-overlay">
            <template v-if="u.status === 'error'">
              <AppIcon name="alert" :size="18" />
              <span class="err">{{ u.error }}</span>
              <span class="pending-actions">
                <button class="btn btn-sm btn-secondary" @click="retry(u)">Retry</button>
                <button class="btn btn-sm btn-ghost light" @click="drop(u)">Dismiss</button>
              </span>
            </template>
            <template v-else>
              <div class="progress"><div :style="{ width: Math.round(u.progress * 100) + '%' }"></div></div>
              <span class="small">{{ u.progress >= 1 ? 'Saving…' : u.progress > 0 ? 'Uploading…' : 'Preparing…' }}</span>
            </template>
          </div>
        </div>

        <button class="photo add-tile" @click="photoInput.click()">
          <AppIcon name="plus" :size="22" />
          <span>Add</span>
        </button>
      </div>

      <button v-else class="dropzone" @click="photoInput.click()">
        <AppIcon name="camera" :size="26" />
        <strong>Add photos</strong>
        <span class="small muted">Take a photo or choose from your library. You can also drop files here.</span>
      </button>

      <p v-if="photos.length > 1 && canReorder" class="form-hint">Drag to reorder. The first photo is the cover.</p>
    </section>

    <!-- Documents -->
    <section v-if="show !== 'photos'" class="card docs-card">
      <div class="card-head">
        <h3>Receipts &amp; files <span v-if="documents.length" class="count">{{ documents.length }}</span></h3>
        <button class="btn btn-secondary btn-sm" @click="docInput.click()">
          <AppIcon name="paperclip" :size="16" /> Add files
        </button>
        <input ref="docInput" type="file" multiple hidden @change="pick($event, 'document')" />
      </div>

      <ul v-if="documents.length || docQueue.length" class="doc-list">
        <li v-for="d in documents" :key="d.id" class="doc">
          <span class="doc-icon"><AppIcon :name="docIcon(d)" :size="18" /></span>
          <div class="doc-main">
            <a :href="fileUrl(d.inline ? d.urls.original : d.urls.download)" target="_blank" rel="noopener" class="doc-name">{{ d.filename }}</a>
            <div class="doc-meta small faint">
              {{ fileSize(d.size) }} · {{ date(d.createdAt) }}
            </div>
            <div v-if="editingId === d.id" class="caption-edit">
              <input v-model="captionDraft" class="form-input" placeholder="Add a note (e.g. “Receipt from estate sale”)" @keydown.enter="saveCaption(d)" @keydown.esc="editingId = null" />
              <button class="btn btn-sm btn-primary" @click="saveCaption(d)">Save</button>
            </div>
            <div v-else-if="d.caption" class="doc-caption small muted">{{ d.caption }}</div>
          </div>
          <div class="doc-actions">
            <button class="btn btn-icon btn-sm btn-ghost" title="Edit note" @click="startCaption(d)"><AppIcon name="edit" :size="15" /></button>
            <a class="btn btn-icon btn-sm btn-ghost" :href="fileUrl(d.urls.download)" title="Download"><AppIcon name="download" :size="15" /></a>
            <button class="btn btn-icon btn-sm btn-ghost" title="Delete" @click="remove(d)"><AppIcon name="trash" :size="15" /></button>
          </div>
        </li>
        <li v-for="u in docQueue" :key="u.id" class="doc pending-doc" :class="{ failed: u.status === 'error' }">
          <span class="doc-icon"><AppIcon :name="u.status === 'error' ? 'alert' : 'upload'" :size="18" /></span>
          <div class="doc-main">
            <span class="doc-name">{{ u.name }}</span>
            <div v-if="u.status === 'error'" class="small negative">{{ u.error }}</div>
            <div v-else class="progress"><div :style="{ width: Math.round(u.progress * 100) + '%' }"></div></div>
          </div>
          <div v-if="u.status === 'error'" class="doc-actions">
            <button class="btn btn-sm btn-secondary" @click="retry(u)">Retry</button>
            <button class="btn btn-icon btn-sm btn-ghost" title="Dismiss" @click="drop(u)"><AppIcon name="x" :size="15" /></button>
          </div>
        </li>
      </ul>
      <p v-else class="muted small empty-docs">
        Receipts, manuals, service records, PDFs — anything you want kept with this {{ owner === 'item' ? 'item' : 'bundle' }}.
      </p>
    </section>

    <div v-if="dropActive" class="drop-hint">
      <AppIcon name="upload" :size="28" />
      <span>Drop to upload</span>
    </div>

    <PhotoLightbox
      v-if="lightboxIndex !== null"
      :photos="photos"
      :start="lightboxIndex"
      @close="lightboxIndex = null"
      @make-cover="makeCover"
      @delete="remove"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'
import PhotoLightbox from './PhotoLightbox.vue'
import { uploadAttachment, updateAttachment, reorderAttachments, deleteAttachment, fileUrl } from '@/services/attachments'
import { isImage } from '@/utils/imageResize'
import { fileSize, date, errorMessage } from '@/utils/format'
import { toastError, confirmAction } from '@/composables/useNotify'

const props = defineProps({
  owner: { type: String, required: true, validator: (v) => ['item', 'bundle'].includes(v) },
  ownerId: { type: String, required: true },
  attachments: { type: Array, default: () => [] },
  // 'all' | 'photos' | 'documents'
  show: { type: String, default: 'all' },
  // Photos and files side by side on wide screens.
  wide: { type: Boolean, default: false }
})
const emit = defineEmits(['change'])

const list = ref([...props.attachments])
watch(() => props.attachments, (v) => { list.value = [...v] })

const photos = computed(() => list.value.filter((a) => a.kind === 'photo').sort((a, b) => a.position - b.position))
const documents = computed(() => list.value.filter((a) => a.kind === 'document').sort((a, b) => a.position - b.position))

const queue = ref([])
const photoQueue = computed(() => queue.value.filter((u) => u.kind === 'photo'))
const docQueue = computed(() => queue.value.filter((u) => u.kind === 'document'))

const photoInput = ref(null)
const docInput = ref(null)
const lightboxIndex = ref(null)
const canReorder = computed(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches)

function publish() {
  emit('change', [...list.value])
}

// ── uploading ────────────────────────────────────────────
let qid = 0
function enqueue(files, kind) {
  for (const file of files) {
    const k = kind || (isImage(file) ? 'photo' : 'document')
    const u = { id: ++qid, file, name: file.name, kind: k, progress: 0, status: 'uploading', error: null, preview: null }
    if (k === 'photo' && /^image\/(jpeg|png|webp|gif)$/.test(file.type)) u.preview = URL.createObjectURL(file)
    queue.value.push(u)
  }
  pump()
}

// Two at a time: fast enough, and gentle on a phone's uplink.
let active = 0
function pump() {
  while (active < 2) {
    const next = queue.value.find((u) => u.status === 'uploading' && !u.started)
    if (!next) return
    next.started = true
    active++
    run(next).finally(() => {
      active--
      pump()
    })
  }
}

async function run(u) {
  try {
    const created = await uploadAttachment(props.owner, props.ownerId, u.file, {
      kind: u.kind,
      onProgress: (p) => { u.progress = p }
    })
    list.value.push(created)
    drop(u)
    publish()
  } catch (err) {
    u.status = 'error'
    u.error = errorMessage(err, 'Upload failed')
  }
}

function retry(u) {
  Object.assign(u, { status: 'uploading', error: null, progress: 0, started: false })
  pump()
}

function drop(u) {
  if (u.preview) URL.revokeObjectURL(u.preview)
  queue.value = queue.value.filter((x) => x.id !== u.id)
}

function pick(event, kind) {
  const files = [...(event.target.files || [])]
  event.target.value = ''
  if (files.length) enqueue(files, kind)
}

// Drop files anywhere on the panel; images become photos, everything else a document.
const dropActive = ref(false)
let dragDepth = 0
const isFileDrag = (e) => [...(e.dataTransfer?.types || [])].includes('Files')
function onDragEnter(e) { if (isFileDrag(e)) { dragDepth++; dropActive.value = true } }
function onDragLeave(e) { if (isFileDrag(e) && --dragDepth <= 0) { dragDepth = 0; dropActive.value = false } }
function onDrop(e) {
  dragDepth = 0
  dropActive.value = false
  const files = [...(e.dataTransfer?.files || [])]
  if (files.length) enqueue(files, props.show === 'documents' ? 'document' : props.show === 'photos' ? 'photo' : null)
}

// ── ordering ─────────────────────────────────────────────
const dragId = ref(null)
const dragOverId = ref(null)
function dragStart(e, p) {
  dragId.value = p.id
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', p.id)
}
async function dropOn(target) {
  const from = photos.value.findIndex((p) => p.id === dragId.value)
  const to = photos.value.findIndex((p) => p.id === target.id)
  dragId.value = dragOverId.value = null
  if (from < 0 || to < 0 || from === to) return
  const ordered = [...photos.value]
  const [moved] = ordered.splice(from, 1)
  ordered.splice(to, 0, moved)
  await saveOrder(ordered)
}

async function makeCover(p) {
  const ordered = [p, ...photos.value.filter((x) => x.id !== p.id)]
  await saveOrder(ordered)
  if (lightboxIndex.value !== null) lightboxIndex.value = 0
}

async function saveOrder(ordered) {
  const before = list.value.map((a) => ({ ...a }))
  ordered.forEach((p, i) => { p.position = i })
  list.value = [...list.value]
  publish()
  try {
    await reorderAttachments(ordered.map((p) => p.id))
  } catch (err) {
    list.value = before
    publish()
    toastError(errorMessage(err, "Couldn't save the new order"))
  }
}

// ── editing ──────────────────────────────────────────────
const editingId = ref(null)
const captionDraft = ref('')
function startCaption(a) {
  editingId.value = a.id
  captionDraft.value = a.caption || ''
}
async function saveCaption(a) {
  try {
    const updated = await updateAttachment(a.id, { caption: captionDraft.value })
    Object.assign(a, { caption: updated.caption })
    editingId.value = null
    publish()
  } catch (err) {
    toastError(errorMessage(err, "Couldn't save the note"))
  }
}

async function remove(a) {
  const ok = await confirmAction({
    title: a.kind === 'photo' ? 'Delete this photo?' : `Delete ${a.filename}?`,
    message: 'The file is removed from storage. This can’t be undone.',
    confirmLabel: 'Delete',
    danger: true
  })
  if (!ok) return
  try {
    await deleteAttachment(a.id)
    list.value = list.value.filter((x) => x.id !== a.id)
    if (lightboxIndex.value !== null && !photos.value.length) lightboxIndex.value = null
    else if (lightboxIndex.value !== null) lightboxIndex.value = Math.min(lightboxIndex.value, photos.value.length - 1)
    publish()
  } catch (err) {
    toastError(errorMessage(err, "Couldn't delete the file"))
  }
}

function openAt(i) { lightboxIndex.value = i }

function docIcon(d) {
  if (/pdf/.test(d.contentType)) return 'receipt'
  if (/^image\//.test(d.contentType)) return 'image'
  return 'file'
}

onBeforeUnmount(() => queue.value.forEach((u) => u.preview && URL.revokeObjectURL(u.preview)))

defineExpose({ addFiles: enqueue, openPhoto: openAt })
</script>

<style scoped>
.attachments { position: relative; display: grid; gap: 1rem; align-items: start; }
@media (min-width: 960px) { .attachments.wide { grid-template-columns: minmax(0, 1.55fr) minmax(300px, 1fr); gap: 1.25rem; } }
.count {
  display: inline-block; margin-left: 0.35rem; padding: 0 0.4rem;
  font-size: 0.75rem; font-weight: 600; color: var(--text-muted);
  background: var(--surface-2); border-radius: 999px; vertical-align: 1px;
}

/* photo grid: the cover takes a 2×2 block */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}
@media (min-width: 640px) { .photo-grid { grid-template-columns: repeat(4, 1fr); } }
.photo {
  position: relative;
  margin: 0;
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-2);
}
.photo.cover { grid-column: span 2; grid-row: span 2; }
.photo.over { outline: 2px dashed var(--primary); outline-offset: 2px; }
.photo-open { display: block; width: 100%; height: 100%; padding: 0; border: 0; background: none; cursor: zoom-in; }
.photo img { width: 100%; height: 100%; object-fit: cover; }
.photo figcaption {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 0.6rem 0.5rem 0.35rem;
  font-size: 0.75rem; color: #fff;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.65));
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  pointer-events: none;
}
.cover-badge { position: absolute; top: 0.4rem; left: 0.4rem; background: rgba(0, 0, 0, 0.6); color: #fff; pointer-events: none; }
.photo-actions {
  position: absolute; top: 0.35rem; right: 0.35rem;
  display: flex; gap: 0.25rem;
  opacity: 0; transition: opacity 0.15s;
}
.photo:hover .photo-actions, .photo:focus-within .photo-actions { opacity: 1; }
@media (hover: none) { .photo-actions { opacity: 1; } }
.mini {
  width: 28px; height: 28px; border-radius: 6px; border: 0;
  background: rgba(0, 0, 0, 0.6); color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.mini:hover { background: rgba(0, 0, 0, 0.85); }

.add-tile {
  border: 1.5px dashed var(--border-strong);
  background: transparent;
  color: var(--text-muted);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem;
  cursor: pointer; font-size: 0.8125rem;
}
.add-tile:hover { border-color: var(--primary); color: var(--primary); }

.pending img { opacity: 0.45; }
.pending-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.5rem; text-align: center; font-size: 0.75rem;
  color: var(--text);
}
.pending.failed .pending-overlay { background: var(--danger-soft); color: var(--danger-strong); }
.pending .err { font-size: 0.7rem; line-height: 1.25; }
.pending-actions { display: flex; gap: 0.25rem; flex-wrap: wrap; justify-content: center; }
.progress { width: 80%; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.progress > div { height: 100%; background: var(--primary); transition: width 0.2s; }
.doc .progress { width: 100%; margin-top: 0.4rem; }

.dropzone {
  width: 100%;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface-2);
  padding: 2rem 1rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
  color: var(--text-muted); cursor: pointer; text-align: center;
}
.dropzone:hover { border-color: var(--primary); color: var(--primary); }
.dropzone strong { color: var(--text); }

.doc-list { display: flex; flex-direction: column; }
.doc {
  display: flex; align-items: flex-start; gap: 0.75rem;
  padding: 0.65rem 0;
  border-top: 1px solid var(--border);
}
.doc:first-child { border-top: 0; padding-top: 0; }
.doc-icon {
  width: 36px; height: 36px; flex: none; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: var(--surface-2); color: var(--text-muted);
}
.doc-main { flex: 1; min-width: 0; }
.doc-name { font-weight: 550; color: var(--text); text-decoration: none; word-break: break-word; }
a.doc-name:hover { color: var(--primary); text-decoration: underline; }
.doc-caption { margin-top: 0.15rem; }
.doc-actions { display: flex; gap: 0.15rem; flex: none; }
.pending-doc.failed .doc-icon { background: var(--danger-soft); color: var(--danger-strong); }
.caption-edit { display: flex; gap: 0.4rem; margin-top: 0.4rem; }
.caption-edit .form-input { min-height: 34px; padding: 0.3rem 0.6rem; font-size: 0.875rem; }
.empty-docs { padding: 0.25rem 0; }

.attachments.dragging .card { border-color: var(--primary); }
.drop-hint {
  position: absolute; inset: 0;
  border: 2px dashed var(--primary); border-radius: var(--radius);
  background: color-mix(in srgb, var(--primary-soft) 85%, transparent);
  color: var(--primary-on-soft);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;
  font-weight: 600; pointer-events: none; z-index: 5;
}
.btn-ghost.light { color: inherit; }
</style>
