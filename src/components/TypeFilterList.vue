<template>
  <section v-if="types.length > 1 || typeFilter" class="type-filter" aria-label="Entry types">
    <div class="type-filter-title">Types</div>
    <ul class="type-filter-list" role="listbox" aria-label="Filter by type">
      <li
        v-for="item in types"
        :key="item.type.id"
        :class="['type-row', { 'type-row--selected': typeFilter === item.type.id }]"
        role="option"
        :aria-selected="typeFilter === item.type.id"
        :data-type="item.type.id"
        @click="pick(item.type.id)"
      >
        <div :class="[item.type.icon, 'type-row-icon']" />
        <span class="type-row-name">{{ item.type.label }}</span>
        <span class="type-row-count">{{ item.count }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useCategoryState } from '@/composables/useCategoryState'
import { ENTRY_TYPES, entryType } from '@/types/entryTypes'

const emit = defineEmits<{ (e: 'picked'): void }>()

const db = useDatabaseStore()
const { typeFilter, toggleType } = useCategoryState()

// Types that have entries (and the selected one), with counts
const types = computed(() => {
  const counts = new Map<string, number>()
  for (const entry of db.table.data) {
    const id = entryType(entry).id
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return ENTRY_TYPES
    .filter((type) => counts.has(type.id) || typeFilter.value === type.id)
    .map((type) => ({ type, count: counts.get(type.id) ?? 0 }))
})

function pick(type: string) {
  toggleType(type)
  emit('picked')
}
</script>

<style scoped>
.type-filter {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--c-border);
}

.type-filter-title {
  padding: 0 var(--space-3) var(--space-1);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.type-filter-list {
  list-style: none;
  margin: 0;
  padding: 0 0 var(--space-1);
}

.type-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 32px;
  margin: 0 var(--space-1);
  padding: 0 var(--space-2) 0 calc(var(--space-2) + 20px);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  cursor: pointer;
  user-select: none;
}
.type-row:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}
.type-row--selected {
  background: color-mix(in srgb, var(--c-accent) 14%, transparent);
  color: var(--c-text);
  font-weight: 600;
}

.type-row-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--c-text-muted);
}
.type-row--selected .type-row-icon {
  color: var(--c-accent);
}

.type-row-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.type-row-count {
  flex-shrink: 0;
  min-width: 20px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--c-bg);
  color: var(--c-text-muted);
  font-size: var(--text-xs);
  font-weight: 500;
  text-align: center;
}
</style>
