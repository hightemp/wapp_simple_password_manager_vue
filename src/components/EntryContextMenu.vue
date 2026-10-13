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
        <button v-for="item in copyItems" :key="item.key" class="ctx-item" @click="emit('copy', item.key)">
          <div :class="item.icon" /> Copy {{ item.label }}
        </button>
        <button v-for="action in actions" :key="action.id" class="ctx-item" @click="emit('action', action.id)">
          <div :class="action.icon" /> {{ action.label }}
        </button>
        <div v-if="copyItems.length || actions.length" class="ctx-sep" />
        <!-- Deleted entry: restore or delete for good -->
        <template v-if="inTrash">
          <button class="ctx-item" @click="emit('restore')">
            <div class="i-lucide-undo-2" /> Restore
          </button>
          <div class="ctx-sep" />
          <button class="ctx-item ctx-item--danger" @click="emit('delete')">
            <div class="i-lucide-trash-2" /> Delete Forever
          </button>
        </template>
        <template v-else>
          <button class="ctx-item" @click="emit('edit')">
            <div class="i-lucide-pencil" /> Edit
          </button>
          <button class="ctx-item" @click="emit('history')">
            <div class="i-lucide-history" /> History
          </button>
          <button class="ctx-item" v-if="entryUrl(entry)" @click="openUrl(entryUrl(entry))">
            <div class="i-lucide-external-link" /> Open URL
          </button>
          <div class="ctx-sep" />
          <button class="ctx-item ctx-item--danger" @click="emit('delete')">
            <div class="i-lucide-trash-2" /> Delete
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, useTemplateRef } from 'vue'
import { entryType, entryUrl, describeField, copyIcon } from '@/types/entryTypes'

const props = defineProps<{
  // Menu is shown while an entry is set
  entry: Record<string, any> | null
  x: number
  y: number
  inTrash?: boolean
}>()

const emit = defineEmits<{
  (e: 'copy', field: string): void
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'history'): void
  (e: 'action', id: string): void
  (e: 'restore'): void
  (e: 'close'): void
}>()

// Copy actions for the entry's quick-copy fields that have a value
const copyItems = computed(() => {
  const entry = props.entry
  if (!entry) return []
  const type = entryType(entry)
  const keys = [...new Set([...type.quickCopy, ...(type.secret ? [type.secret] : [])])]
  return keys.filter((key) => entry[key]).map((key) => ({ key, label: describeField(entry, key).label, icon: copyIcon(key) }))
})

// Extra actions of the type (copy address, Wi-Fi QR code, …)
const actions = computed(() =>
  props.entry ? (entryType(props.entry).actions ?? []).filter((action) => action.available(props.entry!)) : []
)

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
