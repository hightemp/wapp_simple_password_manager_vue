<template>
  <BaseModal v-model="isOpen" :title="title" size="sm">
    <CategoryTree
      :tree="db.categoryTree"
      :total-count="db.table.data.length"
      :uncategorized-count="db.uncategorizedCount"
      :selected="selected"
      :expanded="expanded"
      :show-all="showAll"
      :trash-count="showTrash ? db.trash.length : undefined"
      :trash-selected="showTrash && trashSelected"
      class="picker-tree"
      @select="pick"
      @select-trash="pickTrash"
      @toggle="toggleExpanded"
    />
  </BaseModal>
</template>

<script setup lang="ts">
import { useDatabaseStore } from '@/stores/database'
import { useCategoryState, type CategorySelection } from '@/composables/useCategoryState'
import BaseModal from './BaseModal.vue'
import CategoryTree from './CategoryTree.vue'

withDefaults(defineProps<{
  title: string
  selected: CategorySelection
  // "All" makes sense for filtering, not for moving an entry
  showAll?: boolean
  // Offer the trash (filtering only)
  showTrash?: boolean
}>(), { showAll: true, showTrash: false })

const emit = defineEmits<{
  (e: 'pick', path: CategorySelection): void
  (e: 'pick-trash'): void
}>()
const isOpen = defineModel<boolean>({ required: true })

const db = useDatabaseStore()
const { expanded, toggleExpanded, trashSelected } = useCategoryState()

function pick(path: CategorySelection) {
  // Emit before closing: closing resets the parent's picker mode (filter / move)
  emit('pick', path)
  isOpen.value = false
}

function pickTrash() {
  emit('pick-trash')
  isOpen.value = false
}
</script>

<style scoped>
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
</style>
