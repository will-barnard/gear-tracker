<template>
  <Teleport to="body">
    <div
      class="lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="`Photo ${index + 1} of ${photos.length}`"
      tabindex="-1"
      ref="root"
      @keydown="onKey"
      @click.self="$emit('close')"
    >
      <div class="bar">
        <span class="count">{{ index + 1 }} / {{ photos.length }}</span>
        <div class="bar-actions">
          <button v-if="index > 0 && editable" class="lb-btn" @click="$emit('make-cover', current)" title="Make cover photo">
            <AppIcon name="star" :size="18" /><span class="lbl">Make cover</span>
          </button>
          <a class="lb-btn" :href="fileUrl(current.urls.download)" title="Download original">
            <AppIcon name="download" :size="18" /><span class="lbl">Download</span>
          </a>
          <button v-if="editable" class="lb-btn" @click="$emit('delete', current)" title="Delete photo">
            <AppIcon name="trash" :size="18" />
          </button>
          <button class="lb-btn" @click="$emit('close')" title="Close (Esc)" aria-label="Close">
            <AppIcon name="x" :size="20" />
          </button>
        </div>
      </div>

      <div class="stage" @click.self="$emit('close')" @touchstart.passive="touchStart" @touchend="touchEnd">
        <button v-if="photos.length > 1" class="nav prev" @click="go(-1)" aria-label="Previous photo">
          <AppIcon name="chevron-left" :size="28" />
        </button>
        <img :key="current.id" :src="fileUrl(current.urls.original)" :alt="current.caption || current.filename" />
        <button v-if="photos.length > 1" class="nav next" @click="go(1)" aria-label="Next photo">
          <AppIcon name="chevron-right" :size="28" />
        </button>
      </div>

      <p v-if="current.caption" class="caption">{{ current.caption }}</p>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from './AppIcon.vue'
import { fileUrl } from '@/services/attachments'

const props = defineProps({
  photos: { type: Array, required: true },
  start: { type: Number, default: 0 },
  editable: { type: Boolean, default: true }
})
const emit = defineEmits(['close', 'make-cover', 'delete'])

const index = ref(Math.min(props.start, props.photos.length - 1))
const current = computed(() => props.photos[Math.min(index.value, props.photos.length - 1)])
const root = ref(null)

function go(delta) {
  const n = props.photos.length
  index.value = (index.value + delta + n) % n
}

function onKey(e) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
}

let startX = null
function touchStart(e) { startX = e.touches[0].clientX }
function touchEnd(e) {
  if (startX == null) return
  const dx = e.changedTouches[0].clientX - startX
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
  startX = null
}

// Preload neighbours so swiping feels instant.
function preload() {
  for (const d of [1, -1]) {
    const p = props.photos[(index.value + d + props.photos.length) % props.photos.length]
    if (p) new Image().src = fileUrl(p.urls.original)
  }
}

let prevOverflow = ''
onMounted(() => {
  prevOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  root.value?.focus()
  preload()
})
onBeforeUnmount(() => { document.body.style.overflow = prevOverflow })
</script>

<style scoped>
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(10, 10, 9, 0.94);
  display: flex;
  flex-direction: column;
  color: #f2f0eb;
  outline: none;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  gap: 0.5rem;
}
.count { font-size: 0.875rem; opacity: 0.8; font-variant-numeric: tabular-nums; padding-left: 0.25rem; }
.bar-actions { display: flex; gap: 0.25rem; }
.lb-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  background: transparent; border: 0; color: inherit;
  padding: 0.5rem 0.65rem; border-radius: 8px; cursor: pointer;
  text-decoration: none; font-size: 0.875rem; min-height: 40px;
}
.lb-btn:hover { background: rgba(255, 255, 255, 0.12); }
.stage {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0 0.5rem;
  touch-action: pan-y;
}
.stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
  user-select: none;
}
.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.35);
  border: 0;
  color: #fff;
  width: 48px;
  height: 64px;
  border-radius: 10px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.nav:hover { background: rgba(0, 0, 0, 0.6); }
.prev { left: 0.75rem; }
.next { right: 0.75rem; }
.caption { text-align: center; padding: 0.75rem 1rem 1.25rem; font-size: 0.9rem; opacity: 0.9; }
@media (max-width: 640px) {
  .lbl { display: none; }
  .nav { display: none; }
}
</style>
