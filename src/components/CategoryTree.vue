<template>
  <ul class="cat-tree" role="tree" aria-label="Categories">
    <!-- All entries -->
    <li
      v-if="showAll"
      :class="rowClass(null)"
      role="treeitem"
      :aria-selected="selected === null"
      data-path="*"
      @click="emit('select', null)"
      @dragover="onDragOver($event, null)"
      @dragleave="dropTarget = undefined"
      @drop="onDrop($event, null)"
    >
      <span class="cat-chevron-space" />
      <div class="i-lucide-layers cat-icon" />
      <span class="cat-name">All</span>
      <span class="cat-count">{{ totalCount }}</span>
    </li>

    <!-- New root category -->
    <li v-if="editing?.mode === 'create' && editing.path === ''" class="cat-row cat-row--editing" :style="indent(0)">
      <span class="cat-chevron-space" />
      <div class="i-lucide-folder-plus cat-icon" />
      <input
        ref="editInput"
        v-model="editValue"
        class="cat-input"
        placeholder="New category"
        aria-label="New category name"
        @keydown.enter.prevent.stop="commitEdit"
        @keydown.esc.stop.prevent="cancelEdit"
        @blur="cancelEdit"
      />
    </li>

    <template v-for="item in visibleItems" :key="item.node.path">
      <li
        :class="rowClass(item.node.path)"
        :style="indent(item.depth)"
        role="treeitem"
        :aria-selected="selected === item.node.path"
        :aria-expanded="item.node.children.length ? expanded.has(item.node.path) : undefined"
        :data-path="item.node.path"
        :draggable="manageable && editing?.path !== item.node.path"
        @click="emit('select', item.node.path)"
        @dragstart="onDragStart($event, item.node.path)"
        @dragend="draggingCategory = null"
        @dragover="onDragOver($event, item.node.path)"
        @dragleave="dropTarget = undefined"
        @drop="onDrop($event, item.node.path)"
      >
        <button
          v-if="item.node.children.length"
          class="cat-chevron"
          :aria-label="expanded.has(item.node.path) ? 'Collapse' : 'Expand'"
          @click.stop="emit('toggle', item.node.path)"
        >
          <div :class="expanded.has(item.node.path) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" />
        </button>
        <span v-else class="cat-chevron-space" />

        <div :class="expanded.has(item.node.path) && item.node.children.length ? 'i-lucide-folder-open' : 'i-lucide-folder'" class="cat-icon" />

        <input
          v-if="editing?.mode === 'rename' && editing.path === item.node.path"
          ref="editInput"
          v-model="editValue"
          class="cat-input"
          aria-label="Category name"
          @click.stop
          @keydown.enter.prevent.stop="commitEdit"
          @keydown.esc.stop.prevent="cancelEdit"
          @blur="cancelEdit"
        />
        <template v-else>
          <span class="cat-name" :title="item.node.path">{{ item.node.name }}</span>
          <span v-if="manageable" class="cat-actions">
            <button class="cat-action" title="New subcategory" aria-label="New subcategory" @click.stop="startCreate(item.node.path)">
              <div class="i-lucide-plus" />
            </button>
            <button class="cat-action" title="Rename" aria-label="Rename category" @click.stop="startRename(item.node)">
              <div class="i-lucide-pencil" />
            </button>
            <button class="cat-action cat-action--danger" title="Delete" aria-label="Delete category" @click.stop="emit('delete', item.node.path)">
              <div class="i-lucide-trash-2" />
            </button>
          </span>
          <span class="cat-count">{{ item.node.count }}</span>
        </template>
      </li>

      <!-- New subcategory input, right under its parent -->
      <li
        v-if="editing?.mode === 'create' && editing.path === item.node.path"
        class="cat-row cat-row--editing"
        :style="indent(item.depth + 1)"
      >
        <span class="cat-chevron-space" />
        <div class="i-lucide-folder-plus cat-icon" />
        <input
          ref="editInput"
          v-model="editValue"
          class="cat-input"
          placeholder="New subcategory"
          aria-label="New category name"
          @keydown.enter.prevent.stop="commitEdit"
          @keydown.esc.stop.prevent="cancelEdit"
          @blur="cancelEdit"
        />
      </li>
    </template>

    <!-- Entries without a category -->
    <li
      :class="rowClass('')"
      role="treeitem"
      :aria-selected="selected === ''"
      data-path=""
      @click="emit('select', '')"
      @dragover="onDragOver($event, '')"
      @dragleave="dropTarget = undefined"
      @drop="onDrop($event, '')"
    >
      <span class="cat-chevron-space" />
      <div class="i-lucide-inbox cat-icon" />
      <span class="cat-name">Uncategorized</span>
      <span class="cat-count">{{ uncategorizedCount }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, useTemplateRef } from 'vue'
import { isWithin, ENTRIES_DRAG_TYPE, type CategoryNode } from '@/utils/categories'
import type { CategorySelection } from '@/composables/useCategoryState'

const CATEGORY_DRAG_TYPE = 'application/x-pm-category'

const props = withDefaults(defineProps<{
  tree: CategoryNode[]
  totalCount: number
  uncategorizedCount: number
  selected: CategorySelection
  expanded: Set<string>
  // Show create / rename / delete actions and allow dragging categories
  manageable?: boolean
  showAll?: boolean
}>(), {
  manageable: false,
  showAll: true,
})

const emit = defineEmits<{
  (e: 'select', path: CategorySelection): void
  (e: 'toggle', path: string): void
  (e: 'create', path: string): void
  (e: 'rename', path: string, name: string): void
  (e: 'delete', path: string): void
  (e: 'move-entries', ids: number[], category: string): void
  (e: 'move-category', path: string, newParent: string): void
}>()

// Rows of the expanded part of the tree, depth-first
const visibleItems = computed(() => {
  const items: { node: CategoryNode; depth: number }[] = []
  const walk = (nodes: CategoryNode[], depth: number) => {
    for (const node of nodes) {
      items.push({ node, depth })
      if (props.expanded.has(node.path)) walk(node.children, depth + 1)
    }
  }
  walk(props.tree, 0)
  return items
})

function indent(depth: number) {
  return { paddingLeft: `calc(var(--space-2) + ${depth * 16}px)` }
}

function rowClass(path: CategorySelection) {
  return ['cat-row', {
    'cat-row--selected': props.selected === path,
    'cat-row--drop': dropTarget.value === path,
  }]
}

// --- inline create / rename ---
const editing = ref<{ mode: 'create' | 'rename'; path: string } | null>(null)
const editValue = ref('')
const editInput = useTemplateRef<HTMLInputElement | HTMLInputElement[]>('editInput')

async function focusEditInput() {
  await nextTick()
  const input = Array.isArray(editInput.value) ? editInput.value[0] : editInput.value
  input?.focus()
  input?.select()
}

/** Show the "new category" input under `parent` ('' = root) */
function startCreate(parent: string) {
  editing.value = { mode: 'create', path: parent }
  editValue.value = ''
  focusEditInput()
}

function startRename(node: CategoryNode) {
  editing.value = { mode: 'rename', path: node.path }
  editValue.value = node.name
  focusEditInput()
}

function commitEdit() {
  const current = editing.value
  const value = editValue.value.trim()
  editing.value = null
  if (!current || !value) return
  if (current.mode === 'create') emit('create', current.path ? `${current.path}/${value}` : value)
  else emit('rename', current.path, value)
}

function cancelEdit() {
  editing.value = null
}

defineExpose({ startCreate })

// --- drag & drop ---
const draggingCategory = ref<string | null>(null)
// Row under the cursor during a valid drag (undefined = none, null = "All")
const dropTarget = ref<CategorySelection | undefined>(undefined)

function onDragStart(event: DragEvent, path: string) {
  if (!props.manageable || !event.dataTransfer) return
  draggingCategory.value = path
  event.dataTransfer.setData(CATEGORY_DRAG_TYPE, path)
  event.dataTransfer.effectAllowed = 'move'
}

/** Can the current drag be dropped on `target` (null = All, '' = Uncategorized)? */
function canDrop(event: DragEvent, target: CategorySelection): boolean {
  const types = event.dataTransfer?.types ?? []
  if (types.includes(ENTRIES_DRAG_TYPE)) return target !== null
  if (types.includes(CATEGORY_DRAG_TYPE) && draggingCategory.value) {
    // A category moves to the root via "All", never into itself or Uncategorized
    if (target === '') return false
    return target === null || !isWithin(target, draggingCategory.value)
  }
  return false
}

function onDragOver(event: DragEvent, target: CategorySelection) {
  if (!canDrop(event, target)) return
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
  dropTarget.value = target
}

function onDrop(event: DragEvent, target: CategorySelection) {
  const allowed = canDrop(event, target)
  dropTarget.value = undefined
  if (!allowed) return
  event.preventDefault()
  const data = event.dataTransfer!

  const entries = data.getData(ENTRIES_DRAG_TYPE)
  if (entries) {
    emit('move-entries', JSON.parse(entries), target ?? '')
    return
  }
  const path = data.getData(CATEGORY_DRAG_TYPE)
  draggingCategory.value = null
  if (path) emit('move-category', path, target ?? '')
}
</script>

<style scoped>
.cat-tree {
  list-style: none;
  margin: 0;
  padding: var(--space-1) 0;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 32px;
  padding-right: var(--space-2);
  padding-left: var(--space-2);
  border-radius: var(--radius-md);
  margin: 0 var(--space-1);
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  cursor: pointer;
  user-select: none;
}
.cat-row:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}
.cat-row--selected {
  background: color-mix(in srgb, var(--c-accent) 14%, transparent);
  color: var(--c-text);
  font-weight: 600;
}
.cat-row--drop {
  outline: 2px dashed var(--c-accent);
  outline-offset: -2px;
  background: color-mix(in srgb, var(--c-accent) 10%, transparent);
}

.cat-chevron,
.cat-chevron-space {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}
.cat-chevron {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.cat-chevron:hover {
  background: var(--c-bg);
  color: var(--c-text);
}

.cat-icon {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--c-text-muted);
}
.cat-row--selected .cat-icon {
  color: var(--c-accent);
}

.cat-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cat-count {
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

.cat-actions {
  display: none;
  flex-shrink: 0;
  gap: 2px;
}
.cat-row:hover .cat-actions,
.cat-row:focus-within .cat-actions {
  display: flex;
}

.cat-action {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
}
.cat-action:hover {
  background: var(--c-bg);
  color: var(--c-text);
}
.cat-action--danger:hover {
  color: var(--c-danger);
}

.cat-input {
  flex: 1;
  min-width: 0;
  height: 26px;
  padding: 0 var(--space-2);
  border: 1.5px solid var(--c-accent);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-sm);
  outline: none;
}
</style>
