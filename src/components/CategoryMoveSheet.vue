<template>
  <BaseModal :model-value="path !== null" :title="path ? `Move “${pathName(path)}” to` : ''" size="sm" @update:model-value="(open) => !open && emit('close')">
    <button :class="['top-level-btn', { 'top-level-btn--current': path !== null && !parentPath(path) }]" @click="emit('pick', '')">
      <div class="i-lucide-arrow-up-to-line" /> Top level
    </button>
    <CategoryTree
      :tree="targets"
      :total-count="0"
      :uncategorized-count="0"
      :selected="path ? parentPath(path) || null : null"
      :expanded="expanded"
      :show-all="false"
      :show-uncategorized="false"
      class="picker-tree"
      @select="(target) => emit('pick', target ?? '')"
      @toggle="toggleExpanded"
    />
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useCategoryState } from '@/composables/useCategoryState'
import { pathName, parentPath, isWithin, type CategoryNode } from '@/utils/categories'
import BaseModal from './BaseModal.vue'
import CategoryTree from './CategoryTree.vue'

const props = defineProps<{
  // Category being moved; shown while set
  path: string | null
}>()

const emit = defineEmits<{
  // New parent ('' = top level)
  (e: 'pick', parent: string): void
  (e: 'close'): void
}>()

const db = useDatabaseStore()
const { expanded, toggleExpanded } = useCategoryState()

// A category cannot go into itself or its subcategories
function without(nodes: CategoryNode[], path: string): CategoryNode[] {
  return nodes
    .filter((node) => !isWithin(node.path, path))
    .map((node) => ({ ...node, children: without(node.children, path) }))
}

const targets = computed(() => (props.path ? without(db.categoryTree, props.path) : []))
</script>

<style scoped>
.top-level-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-2);
  margin-bottom: var(--space-1);
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--c-text);
  font-size: var(--text-lg);
  text-align: left;
  cursor: pointer;
}
.top-level-btn--current {
  background: color-mix(in srgb, var(--c-accent) 14%, transparent);
}

/* Touch-friendly rows */
.picker-tree :deep(.cat-row) {
  min-height: 44px;
  font-size: var(--text-lg);
}
.picker-tree :deep(.cat-chevron) {
  width: 36px;
  height: 36px;
  font-size: 18px;
}
.picker-tree :deep(.cat-chevron-space) {
  width: 36px;
}
/* Entry counts don't matter when choosing where a category goes */
.picker-tree :deep(.cat-count) {
  display: none;
}
</style>
