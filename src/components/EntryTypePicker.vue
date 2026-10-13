<template>
  <BaseModal v-model="isOpen" title="New entry" size="sm" instant-close @closed="onClosed">
    <div class="type-grid" role="list">
      <button
        v-for="type in ENTRY_TYPES"
        :key="type.id"
        class="type-option"
        :data-type="type.id"
        role="listitem"
        @click="pick(type.id)"
      >
        <div :class="[type.icon, 'type-option-icon']" />
        <span>{{ type.label }}</span>
      </button>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ENTRY_TYPES } from '@/types/entryTypes'
import BaseModal from './BaseModal.vue'

const isOpen = defineModel<boolean>({ required: true })
const emit = defineEmits<{ (e: 'pick', type: string): void }>()

// The form opens once this modal is gone, so the two never overlap
let picked: string | null = null

function pick(type: string) {
  picked = type
  isOpen.value = false
}

function onClosed() {
  if (picked) emit('pick', picked)
  picked = null
}
</script>

<style scoped>
.type-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.type-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 52px;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-base);
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.type-option:hover,
.type-option:focus-visible {
  border-color: var(--c-accent);
  background: color-mix(in srgb, var(--c-accent) 6%, var(--c-surface));
  outline: none;
}

.type-option-icon {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--c-accent);
}
</style>
