<template>
  <BaseModal :model-value="path !== null" :title="path ? pathName(path) : ''" size="sm" @update:model-value="(open) => !open && emit('close')">
    <nav class="menu-list">
      <button v-for="item in ITEMS" :key="item.action" :class="['menu-item', { 'menu-item--danger': item.action === 'delete' }]" @click="emit('action', item.action)">
        <div :class="item.icon" class="menu-item-icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </BaseModal>
</template>

<script setup lang="ts">
import { pathName } from '@/utils/categories'
import BaseModal from './BaseModal.vue'

export type CategoryMenuAction = 'create' | 'rename' | 'move' | 'delete'

defineProps<{
  // Category the menu is for; shown while set
  path: string | null
}>()

const emit = defineEmits<{
  (e: 'action', action: CategoryMenuAction): void
  (e: 'close'): void
}>()

const ITEMS: { action: CategoryMenuAction; label: string; icon: string }[] = [
  { action: 'create', label: 'New subcategory', icon: 'i-lucide-folder-plus' },
  { action: 'rename', label: 'Rename', icon: 'i-lucide-folder-pen' },
  { action: 'move', label: 'Move to…', icon: 'i-lucide-folder-input' },
  { action: 'delete', label: 'Delete', icon: 'i-lucide-trash-2' },
]
</script>

<style scoped>
.menu-list {
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 52px;
  padding: 0 var(--space-2);
  border: none;
  border-bottom: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-text);
  font-size: var(--text-lg);
  text-align: left;
  cursor: pointer;
}
.menu-item:last-child {
  border-bottom: none;
}
.menu-item:active {
  background: var(--c-bg-hover);
}

.menu-item-icon {
  font-size: 22px;
  color: var(--c-text-secondary);
}

.menu-item--danger,
.menu-item--danger .menu-item-icon {
  color: var(--c-danger);
}
</style>
