<template>
  <div class="trash-bar">
    <template v-if="compact">
      <span class="trash-bar-text">Deleted entries are removed for good after {{ TRASH_DAYS }} days</span>
      <button v-if="db.trash.length" class="action-btn action-btn--danger action-btn--sm" @click="emit('empty')">Empty trash</button>
    </template>
    <template v-else>
      <div class="i-lucide-trash-2 trash-bar-icon" />
      <span class="trash-bar-text">Deleted entries are removed for good after {{ TRASH_DAYS }} days. Right-click an entry to restore it.</span>
      <button v-if="db.trash.length" class="action-btn action-btn--danger action-btn--sm" @click="emit('empty')">
        <div class="i-lucide-trash-2" /> Empty trash
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useDatabaseStore, TRASH_DAYS } from '@/stores/database'

defineProps<{
  // Short text without the icon (mobile)
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'empty'): void
}>()

const db = useDatabaseStore()
</script>

<style scoped>
.trash-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--c-border);
  background: color-mix(in srgb, var(--c-danger) 6%, var(--c-bg-elevated));
  flex-shrink: 0;
}

.trash-bar-icon {
  flex-shrink: 0;
  color: var(--c-danger);
}

.trash-bar-text {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
}
</style>
