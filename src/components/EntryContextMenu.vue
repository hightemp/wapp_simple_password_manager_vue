<template>
  <Teleport to="body">
    <Transition name="ctx">
      <div
        v-if="entry"
        ref="menu"
        class="context-menu"
        :style="{ top: position.top + 'px', left: position.left + 'px' }"
        @click="emit('close')"
      >
        <button class="ctx-item" @click="emit('copy', 'login')">
          <div class="i-lucide-user" /> Copy Login
        </button>
        <button class="ctx-item" @click="emit('copy', 'password')">
          <div class="i-lucide-lock" /> Copy Password
        </button>
        <div class="ctx-sep" />
        <button class="ctx-item" @click="emit('edit')">
          <div class="i-lucide-pencil" /> Edit
        </button>
        <button class="ctx-item" v-if="entry.url" @click="openUrl(entry.url)">
          <div class="i-lucide-external-link" /> Open URL
        </button>
        <div class="ctx-sep" />
        <button class="ctx-item ctx-item--danger" @click="emit('delete')">
          <div class="i-lucide-trash-2" /> Delete
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, useTemplateRef } from 'vue'

const props = defineProps<{
  // Menu is shown while an entry is set
  entry: Record<string, any> | null
  x: number
  y: number
}>()

const emit = defineEmits<{
  (e: 'copy', field: 'login' | 'password'): void
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'close'): void
}>()

// Gap kept between the menu and the viewport edges
const EDGE_GAP = 8

const menu = useTemplateRef<HTMLElement>('menu')
const position = ref({ top: 0, left: 0 })

// Open at the cursor, then shift the menu back inside the viewport once its size is known
watch(() => [props.entry, props.x, props.y], async () => {
  position.value = { top: props.y, left: props.x }
  if (!props.entry) return
  await nextTick()
  const el = menu.value
  if (!el) return
  position.value = {
    top: Math.max(EDGE_GAP, Math.min(props.y, window.innerHeight - el.offsetHeight - EDGE_GAP)),
    left: Math.max(EDGE_GAP, Math.min(props.x, window.innerWidth - el.offsetWidth - EDGE_GAP)),
  }
}, { immediate: true })

function openUrl(url: string) {
  window.open(url, '_blank', 'noopener')
}
</script>

<style scoped>
/* ===== Context Menu ===== */
.context-menu {
  position: fixed;
  z-index: 500;
  min-width: 180px;
  background: var(--c-bg-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-1) 0;
  overflow: hidden;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--c-text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ctx-item:hover {
  background: var(--c-bg-hover);
}
.ctx-item--danger {
  color: var(--c-danger);
}
.ctx-item--danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.ctx-sep {
  height: 1px;
  background: var(--c-border);
  margin: var(--space-1) 0;
}

.ctx-enter-active,
.ctx-leave-active {
  transition: all 150ms ease;
}
.ctx-enter-from,
.ctx-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
