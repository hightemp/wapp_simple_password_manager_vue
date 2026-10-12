<template>
  <BaseModal v-model="isOpen" title="Keyboard Shortcuts" size="sm" :closable="true">
    <div class="shortcuts-list">
      <div class="shortcut-item" v-for="shortcut in SHORTCUTS" :key="shortcut.key">
        <kbd class="shortcut-kbd">{{ shortcut.key }}</kbd>
        <span class="shortcut-desc">{{ shortcut.description }}</span>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'

const isOpen = defineModel<boolean>({ required: true })

const SHORTCUTS = [
  { key: 'Ctrl + S', description: 'Save all changes' },
  { key: 'Ctrl + N', description: 'Add new entry' },
  { key: 'Ctrl + F', description: 'Focus first filter' },
  { key: '↑ / ↓', description: 'Select previous / next entry' },
  { key: '← / →', description: 'Previous / next page' },
  { key: 'Home / End', description: 'First / last page' },
  { key: 'Delete', description: 'Move selected entries to the trash' },
  { key: 'Enter', description: 'Edit selected entry' },
  { key: 'Escape', description: 'Deselect / Close modal' },
]
</script>

<style scoped>
/* ===== Keyboard Shortcuts Modal ===== */
.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--c-border);
}
.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-kbd {
  display: inline-flex;
  padding: var(--space-1) var(--space-2);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--c-text);
  box-shadow: 0 1px 0 var(--c-border);
  min-width: 80px;
  justify-content: center;
}

.shortcut-desc {
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
}
</style>
