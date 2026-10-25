// Uploads go one file per request so each gets its own progress bar and a
// failure (NAS asleep, too large) doesn't take the rest of the batch with it.
import api from './api'
import { preparePhoto, isImage } from '@/utils/imageResize'

export async function uploadAttachment(owner, ownerId, file, { kind, caption, onProgress } = {}) {
  const asPhoto = kind === 'photo' || (kind == null && isImage(file))
  const form = new FormData()
  let upload = file
  // Fields first: the server reads them before the file parts arrive.
  if (asPhoto) {
    const prepared = await preparePhoto(file)
    upload = prepared.file
    form.append('kind', 'photo')
    if (prepared.width) form.append('width', String(prepared.width))
    if (prepared.height) form.append('height', String(prepared.height))
    if (caption) form.append('caption', caption)
    form.append('file', upload, upload.name)
    if (prepared.thumb) form.append('thumb', prepared.thumb, 'thumb.jpg')
  } else {
    form.append('kind', 'document')
    if (caption) form.append('caption', caption)
    form.append('file', file, file.name)
  }
  const res = await api.post(`/${owner === 'item' ? 'items' : 'bundles'}/${ownerId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0,
    onUploadProgress: (e) => onProgress?.(e.total ? e.loaded / e.total : 0)
  })
  return res.data
}

export const updateAttachment = (id, data) => api.patch(`/attachments/${id}`, data).then((r) => r.data)
export const reorderAttachments = (ids) => api.post('/attachments/reorder', { ids })
export const deleteAttachment = (id) => api.delete(`/attachments/${id}`)

// File URLs from the API are '/api/files/…'. When the API lives elsewhere
// (VITE_API_URL in dev), point them at it.
const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '')
export const fileUrl = (path) => (path && base && path.startsWith('/api/') ? base + path : path)
