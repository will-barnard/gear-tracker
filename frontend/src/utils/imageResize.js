// Resizes a photo in the browser before upload: the long edge is capped at
// 2560px (JPEG q0.85) and a 480px thumbnail is made alongside it.
//
// Doing it here rather than on the server means a 6 MB phone photo uploads as
// ~1 MB over cellular, Safari converts HEIC to JPEG on the way through, and
// re-encoding through a canvas drops EXIF — including the GPS location phone
// cameras embed, which you don't want on a listing photo.
//
// If the browser can't decode the file (e.g. HEIC in Chrome), the original is
// returned untouched with no thumbnail and the server stores it as-is.

const MAX_EDGE = 2560
const THUMB_EDGE = 480

async function decode(file) {
  if ('createImageBitmap' in window) {
    try {
      // imageOrientation: 'from-image' applies the EXIF rotation, so the
      // re-encoded pixels are upright once the EXIF tag is gone.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function draw(source, maxEdge, quality) {
  const w = source.width
  const h = source.height
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  const cw = Math.max(1, Math.round(w * scale))
  const ch = Math.max(1, Math.round(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff' // transparent PNGs become white, not black
  ctx.fillRect(0, 0, cw, ch)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, cw, ch)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve({ blob, width: cw, height: ch }) : reject(new Error('encode failed'))), 'image/jpeg', quality)
  })
}

function jpegName(name) {
  const base = String(name || 'photo').replace(/\.[^.]+$/, '')
  return `${base}.jpg`
}

export async function preparePhoto(file) {
  // Animated GIFs would lose their animation; keep them as they are.
  if (file.type === 'image/gif') return { file, thumb: null, width: null, height: null, resized: false }
  let source
  try {
    source = await decode(file)
  } catch {
    return { file, thumb: null, width: null, height: null, resized: false }
  }
  try {
    const main = await draw(source, MAX_EDGE, 0.85)
    const thumb = await draw(source, THUMB_EDGE, 0.8)
    // Always the re-encoded copy, even when it isn't smaller: uploading the
    // original would keep its EXIF/GPS.
    return {
      file: new File([main.blob], jpegName(file.name), { type: 'image/jpeg' }),
      thumb: new File([thumb.blob], 'thumb.jpg', { type: 'image/jpeg' }),
      width: main.width,
      height: main.height,
      resized: true
    }
  } finally {
    if (typeof source.close === 'function') source.close()
  }
}

export const isImage = (file) => /^image\//.test(file?.type || '') || /\.(heic|heif)$/i.test(file?.name || '')
