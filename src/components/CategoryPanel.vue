<template>
  <!-- Collapsed: a thin strip with an expand button -->
  <aside v-if="collapsed" class="cat-panel cat-panel--collapsed">
    <button class="cat-panel-btn" title="Show categories" aria-label="Show categories" @click="collapsed = false">
      <div class="i-lucide-panel-left-open" />
    </button>
  </aside>

  <aside v-else class="cat-panel" :style="{ width: width + 'px' }" aria-label="Category panel">
    <header class="cat-panel-header">
      <span class="cat-panel-title">Categories</span>
      <button class="cat-panel-btn" title="New category" aria-label="New category" @click="tree?.startCreate('')">
        <div class="i-lucide-folder-plus" />
      </button>
      <button class="cat-panel-btn" title="Hide categories" aria-label="Hide categories" @click="collapsed = true">
        <div class="i-lucide-panel-left-close" />
      </button>
    </header>

    <div class="cat-panel-scroll">
      <CategoryTree
        ref="tree"
        :tree="db.categoryTree"
        :total-count="db.table.data.length"
        :uncategorized-count="db.uncategorizedCount"
        :selected="effectiveSelection(db.categoryPaths)"
        :expanded="expanded"
        manageable
        @select="(path) => (selected = path)"
        @toggle="toggleExpanded"
        @create="createCategory"
        @rename="renameCategory"
        @delete="deleteCategory"
        @move-entries="moveEntries"
        @move-category="moveCategory"
      />
    </div>

    <!-- Drag to resize -->
    <div
      class="cat-panel-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize category panel"
      @pointerdown="startResize"
    />
  </aside>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useCategoryState, clampWidth } from '@/composables/useCategoryState'
import { useNotify } from '@/composables/useNotify'
import { useConfirm } from '@/composables/useConfirm'
import { parentPath } from '@/utils/categories'
import CategoryTree from './CategoryTree.vue'

const db = useDatabaseStore()
const notify = useNotify()
const confirmAction = useConfirm()
const {
  selected, expanded, width, collapsed,
  toggleExpanded, reveal, followRename, followDelete, effectiveSelection,
} = useCategoryState()
const tree = useTemplateRef('tree')

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function createCategory(path: string) {
  try {
    const created = db.createCategory(path)
    reveal(created)
  } catch (error) {
    notify('Cannot create category', errorText(error), 'error')
  }
}

function renameCategory(path: string, name: string) {
  try {
    followRename(path, db.renameCategory(path, name))
  } catch (error) {
    notify('Cannot rename category', errorText(error), 'error')
  }
}

async function deleteCategory(path: string) {
  const node = findNode(path)
  const parent = parentPath(path)
  const confirmed = await confirmAction({
    title: 'Delete category',
    message: `Delete "${path}"?\n\n` +
      (node && node.count > 0
        ? `Its ${node.count} entries and subcategories move to ${parent ? `"${parent}"` : 'Uncategorized / the top level'}. No entries are deleted.`
        : 'No entries are deleted.'),
    confirmText: 'Delete',
    danger: true,
  })
  if (!confirmed) return
  db.deleteCategory(path)
  followDelete(path, parent)
}

function moveCategory(path: string, newParent: string) {
  try {
    followRename(path, db.moveCategory(path, newParent))
  } catch (error) {
    notify('Cannot move category', errorText(error), 'error')
  }
}

function moveEntries(ids: number[], category: string) {
  db.moveEntries(ids, category)
  notify(
    ids.length === 1 ? 'Entry moved' : `${ids.length} entries moved`,
    category ? `to "${category}"` : 'to Uncategorized',
    'success',
    2000,
  )
}

function findNode(path: string) {
  const stack = [...db.categoryTree]
  while (stack.length) {
    const node = stack.pop()!
    if (node.path === path) return node
    stack.push(...node.children)
  }
  return undefined
}

// --- resize ---
function startResize(event: PointerEvent) {
  const startX = event.clientX
  const startWidth = width.value
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  const onMove = (move: PointerEvent) => { width.value = clampWidth(startWidth + move.clientX - startX) }
  const onUp = () => {
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onUp)
  }
  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onUp)
}
</script>

<style scoped>
.cat-panel {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--c-border);
  background: var(--c-bg-elevated);
  min-height: 0;
}

.cat-panel--collapsed {
  width: 40px;
  align-items: center;
  padding-top: var(--space-2);
}

.cat-panel-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  height: 40px;
  padding: 0 var(--space-2) 0 var(--space-3);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}

.cat-panel-title {
  flex: 1;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cat-panel-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
  font-size: 16px;
  cursor: pointer;
}
.cat-panel-btn:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}

.cat-panel-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.cat-panel-resizer {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 1;
  touch-action: none;
}
.cat-panel-resizer:hover {
  background: color-mix(in srgb, var(--c-accent) 40%, transparent);
}
</style>
