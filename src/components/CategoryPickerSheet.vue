<template>
  <BaseModal v-model="isOpen" :title="title" size="sm">
    <button v-if="manageable" class="new-category-btn" @click="naming = { mode: 'create', parent: '' }">
      <div class="i-lucide-folder-plus" /> New category
    </button>
    <CategoryTree
      :tree="db.categoryTree"
      :total-count="db.table.data.length"
      :uncategorized-count="db.uncategorizedCount"
      :selected="selected"
      :expanded="expanded"
      :show-all="showAll"
      :trash-count="showTrash ? db.trash.length : undefined"
      :trash-selected="showTrash && trashSelected"
      :menu-button="manageable"
      class="picker-tree"
      @select="pick"
      @select-trash="pickTrash"
      @toggle="toggleExpanded"
      @menu="(path) => (menuPath = path)"
    />
    <TypeFilterList v-if="showTrash" class="picker-types" @picked="isOpen = false" />
  </BaseModal>

  <!-- Managing categories (on top of the sheet) -->
  <CategoryMenuSheet :path="menuPath" @action="onMenuAction" @close="menuPath = null" />
  <CategoryNameDialog
    :open="naming !== null"
    :title="naming?.mode === 'rename' ? 'Rename category' : naming?.parent ? 'New subcategory' : 'New category'"
    :hint="namingHint"
    :initial="naming?.mode === 'rename' ? pathName(naming.path) : ''"
    @save="onNameSaved"
    @close="naming = null"
  />
  <CategoryMoveSheet :path="movingPath" @pick="onMoveTarget" @close="movingPath = null" />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useCategoryState, type CategorySelection } from '@/composables/useCategoryState'
import { useCategoryActions } from '@/composables/useCategoryActions'
import { pathName, parentPath, joinPath } from '@/utils/categories'
import BaseModal from './BaseModal.vue'
import CategoryTree from './CategoryTree.vue'
import TypeFilterList from './TypeFilterList.vue'
import CategoryMenuSheet, { type CategoryMenuAction } from './CategoryMenuSheet.vue'
import CategoryNameDialog from './CategoryNameDialog.vue'
import CategoryMoveSheet from './CategoryMoveSheet.vue'

withDefaults(defineProps<{
  title: string
  selected: CategorySelection
  // "All" makes sense for filtering, not for moving an entry
  showAll?: boolean
  // Offer the trash (filtering only)
  showTrash?: boolean
  // Create, rename, move and delete categories (filtering only)
  manageable?: boolean
}>(), { showAll: true, showTrash: false, manageable: false })

const emit = defineEmits<{
  (e: 'pick', path: CategorySelection): void
  (e: 'pick-trash'): void
}>()
const isOpen = defineModel<boolean>({ required: true })

const db = useDatabaseStore()
const { expanded, toggleExpanded, trashSelected } = useCategoryState()
const { createCategory, renameCategory, deleteCategory, moveCategories } = useCategoryActions()

// --- managing categories ---
// Category whose "⋯" menu is open
const menuPath = ref<string | null>(null)
// Name being entered for a new or renamed category
const naming = ref<{ mode: 'create'; parent: string } | { mode: 'rename'; path: string } | null>(null)
// Category being moved (choosing where to)
const movingPath = ref<string | null>(null)

const namingHint = computed(() => {
  const where = naming.value?.mode === 'create' ? naming.value.parent : parentPath(naming.value?.path ?? '')
  return where ? `In ${where}` : 'At the top level'
})

// Closing the sheet closes what was opened from it
watch(isOpen, (open) => {
  if (open) return
  menuPath.value = null
  naming.value = null
  movingPath.value = null
})

async function onMenuAction(action: CategoryMenuAction) {
  const path = menuPath.value
  menuPath.value = null
  if (!path) return
  if (action === 'create') naming.value = { mode: 'create', parent: path }
  else if (action === 'rename') naming.value = { mode: 'rename', path }
  else if (action === 'move') movingPath.value = path
  else await deleteCategory(path)
}

function onNameSaved(name: string) {
  const current = naming.value
  naming.value = null
  if (current?.mode === 'create') createCategory(joinPath(current.parent, name))
  else if (current) renameCategory(current.path, name)
}

function onMoveTarget(parent: string) {
  const path = movingPath.value
  movingPath.value = null
  if (path) moveCategories([path], parent)
}

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
.new-category-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 44px;
  padding: 0 var(--space-2);
  margin-bottom: var(--space-1);
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--c-accent);
  font-size: var(--text-lg);
  cursor: pointer;
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
.picker-types :deep(.type-row) {
  min-height: 44px;
  font-size: var(--text-lg);
  padding-left: calc(var(--space-2) + 36px);
}
.picker-tree :deep(.cat-chevron-space) {
  width: 36px;
}
</style>
