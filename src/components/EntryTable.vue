<template>
  <div class="entry-table">
    <!-- Pagination bar -->
    <div class="pagination-bar" v-if="pageCount > 1">
      <button class="pg-btn" @click="goToFirstPage" :disabled="page <= 1" aria-label="First page">
        <div class="i-lucide-chevrons-left" />
      </button>
      <button class="pg-btn" @click="goToPrevPage" :disabled="page <= 1" aria-label="Previous page">
        <div class="i-lucide-chevron-left" />
      </button>
      <span class="pg-info">{{ page }} / {{ pageCount }}</span>
      <button class="pg-btn" @click="goToNextPage" :disabled="page >= pageCount" aria-label="Next page">
        <div class="i-lucide-chevron-right" />
      </button>
      <button class="pg-btn" @click="goToLastPage" :disabled="page >= pageCount" aria-label="Last page">
        <div class="i-lucide-chevrons-right" />
      </button>
      <span class="pg-count">{{ filteredRows.length }} entries</span>
    </div>

    <!-- Data table -->
    <div class="table-scroll" ref="tableScroll">
      <div class="data-grid" role="grid" ref="dataGrid" tabindex="0">
        <!-- Header -->
        <div class="grid-row grid-header" :style="gridStyle" role="row">
          <div
            v-for="column in TABLE_COLUMNS"
            :key="column.key"
            class="grid-cell grid-cell-header"
            role="columnheader"
            @click="toggleSort(column.key)"
            :aria-sort="sortKey === column.key ? (sortAsc ? 'ascending' : 'descending') : 'none'"
          >
            <div class="header-label-row">
              <span class="header-label">{{ column.label }}</span>
              <div v-if="sortKey === column.key" :class="sortAsc ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="sort-icon" />
            </div>
            <div v-if="column.filter" class="filter-wrap">
              <div class="i-lucide-search filter-icon" />
              <input
                type="text"
                class="filter-input"
                placeholder="Filter..."
                :value="db.table.filter[column.key]"
                @input="(event) => onFilterInput(event, column.key)"
                @click.stop
                autocomplete="off"
              />
            </div>
            <div v-else class="filter-wrap filter-wrap--empty" />
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="pageRows.length === 0" class="empty-state">
          <template v-if="isTrashView">
            <div class="i-lucide-trash-2 empty-icon" />
            <p class="empty-title">Trash is empty</p>
            <p class="empty-sub">Deleted entries stay here for {{ TRASH_DAYS }} days</p>
          </template>
          <template v-else>
            <div class="i-lucide-database empty-icon" />
            <p class="empty-title">No entries</p>
            <p class="empty-sub">Click <strong>Add</strong> to create your first entry</p>
          </template>
        </div>

        <!-- Rows -->
        <TransitionGroup name="row">
          <div
            v-for="(row, index) in pageRows"
            :key="row.id ?? index"
            :class="['grid-row', { active: selectedIds.has(row.id!) }]"
            :style="gridStyle"
            role="row"
            :aria-selected="selectedIds.has(row.id!)"
            :draggable="!isTrashView"
            @mousedown="(event) => event.shiftKey && event.preventDefault()"
            @click="onRowClick(row, $event)"
            @dragstart="onRowDragStart($event, row)"
            @dblclick="emit('edit')"
            @contextmenu.prevent="emit('contextmenu', $event, row)"
          >
            <!-- Name with the type icon -->
            <div class="grid-cell" role="gridcell">
              <div class="cell-name">
                <div :class="[entryType(row).icon, 'cell-type-icon']" :title="entryType(row).label" />
                <span class="cell-text">{{ row.name }}</span>
                <ExpiryBadge :entry="row" />
              </div>
            </div>
            <!-- Details: the type's summary, with a copy button for its main value -->
            <div class="grid-cell" role="gridcell">
              <div v-if="cellValue(row, 'details')" class="cell-secret">
                <span class="cell-text">{{ cellValue(row, 'details') }}</span>
                <button
                  v-if="detailsCopy(row)"
                  class="cell-action-btn"
                  @click.stop="emit('copy', row, detailsCopy(row)!.key)"
                  :aria-label="`Copy ${detailsCopy(row)!.label.toLowerCase()}`"
                >
                  <div :class="copiedCells.has(detailsCopy(row)!.key + '-' + row.id) ? 'i-lucide-check' : 'i-lucide-copy'" :style="copiedCells.has(detailsCopy(row)!.key + '-' + row.id) ? 'color:var(--c-success)' : ''" />
                </button>
              </div>
            </div>
            <!-- Main secret -->
            <div class="grid-cell" role="gridcell">
              <div v-if="mainSecret(row)?.value" class="cell-secret">
                <div class="i-lucide-lock cell-icon" />
                <span v-if="!revealedRows.has(row.id)" class="masked">••••••••</span>
                <span v-else class="revealed">{{ revealedSecret(row) }}</span>
                <button class="cell-action-btn" @click.stop="togglePasswordVisibility(row.id)" :aria-label="(revealedRows.has(row.id) ? 'Hide ' : 'Show ') + mainSecret(row)!.label.toLowerCase()">
                  <div :class="revealedRows.has(row.id) ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
                </button>
                <button class="cell-action-btn" @click.stop="emit('copy', row, mainSecret(row)!.key)" :aria-label="'Copy ' + mainSecret(row)!.label.toLowerCase()">
                  <div :class="copiedCells.has(mainSecret(row)!.key + '-' + row.id) ? 'i-lucide-check' : 'i-lucide-copy'" :style="copiedCells.has(mainSecret(row)!.key + '-' + row.id) ? 'color:var(--c-success)' : ''" />
                </button>
              </div>
            </div>
            <!-- URL -->
            <div class="grid-cell" role="gridcell">
              <div v-if="entryUrl(row)" class="cell-url">
                <div class="i-lucide-external-link cell-icon" />
                <a :href="entryUrl(row)" target="_blank" rel="noopener" class="url-link">{{ entryUrl(row) }}</a>
              </div>
            </div>
            <!-- Notes -->
            <div class="grid-cell" role="gridcell">
              <span class="cell-text">{{ row.description }}</span>
            </div>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive, nextTick, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useDatabaseStore, TRASH_DAYS, type Entry } from '@/stores/database'
import { useEntryList, cellValue, TABLE_COLUMNS } from '@/composables/useEntryList'
import { useEntrySelection } from '@/composables/useEntrySelection'
import { isInputFocused, isModalOpen } from '@/composables/useHotkeys'
import { debounce } from '@/utils/debounce'
import { ENTRIES_DRAG_TYPE } from '@/utils/categories'
import { formatCardNumber } from '@/utils/card'
import { entryType, mainSecret, entryUrl, describeField } from '@/types/entryTypes'
import ExpiryBadge from './ExpiryBadge.vue'

defineProps<{
  // Keys like "password-12" of buttons that were just used, to show a check mark
  copiedCells: Set<string>
}>()

const emit = defineEmits<{
  (e: 'copy', entry: Entry, field: string): void
  // Double-click on a row
  (e: 'edit'): void
  (e: 'contextmenu', event: MouseEvent, entry: Entry): void
}>()

const db = useDatabaseStore()
const { filteredRows, isTrashView, sortKey, sortAsc, toggleSort } = useEntryList()
const { selectedEntry, selectedIds, selectSingle, selectRow, collapseSelection } = useEntrySelection()

const tableScroll = useTemplateRef<HTMLElement>('tableScroll')
const dataGrid = useTemplateRef<HTMLElement>('dataGrid')

const gridStyle = { display: 'grid', gridTemplateColumns: TABLE_COLUMNS.map((column) => column.width).join(' ') }

// Rows whose main secret is shown; hidden again after 3 s
const revealedRows = reactive(new Set<Entry['id']>())
// A new database (lock, import, merge) has other entries
watch(() => db.table, () => revealedRows.clear())

/** Field copied by the button in the Details column (its main non-secret value) */
function detailsCopy(entry: Entry) {
  const type = entryType(entry)
  const key = type.quickCopy.find((k) => k !== type.secret && entry[k])
  return key ? { key, label: describeField(entry, key).label } : null
}

function revealedSecret(entry: Entry): string {
  const secret = mainSecret(entry)!
  return secret.key === 'card_number' ? formatCardNumber(secret.value) : secret.value
}

function togglePasswordVisibility(rowId: Entry['id']) {
  if (revealedRows.has(rowId)) {
    revealedRows.delete(rowId)
  } else {
    revealedRows.add(rowId)
    setTimeout(() => revealedRows.delete(rowId), 3000)
  }
}

// --- pagination ---
// Height of the scrollable table area, kept up to date by a ResizeObserver
const tableHeight = ref(window.innerHeight - 100)
const resizeObserver = new ResizeObserver(([entry]) => {
  tableHeight.value = entry.contentRect.height
})

const rowsPerPage = computed(() => Math.max(1, Math.floor((tableHeight.value - 60) / 40)))

const page = computed({
  get: () => db.table.page ?? 1,
  set: (value) => { db.table.page = Number(value) },
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / rowsPerPage.value)))

// Keep the current page in range when rows are filtered out or the window grows
watch(pageCount, (count) => {
  if (page.value > count) page.value = count
})

const pageRows = computed(() =>
  filteredRows.value.slice((page.value - 1) * rowsPerPage.value, page.value * rowsPerPage.value)
)

function goToFirstPage() { page.value = 1 }
function goToPrevPage() { if (page.value > 1) page.value -= 1 }
function goToLastPage() { page.value = pageCount.value }
function goToNextPage() { if (page.value < pageCount.value) page.value += 1 }

const onFilterInput = debounce((event: Event, key: string) => {
  db.setFilter(key, (event.target as HTMLInputElement).value)
  // Reset to page 1 when filter changes so rows aren't out of range
  page.value = 1
}, 300)

// --- rows ---
function onRowClick(row: Entry, event: MouseEvent) {
  selectRow(row, event)
  // Focus the grid so keyboard navigation works
  dataGrid.value?.focus()
}

function onRowDragStart(event: DragEvent, row: Entry) {
  if (!event.dataTransfer) return
  // Dragging an unselected row drags just that row
  if (!selectedIds.value.has(row.id!)) selectSingle(row)
  const ids = [...selectedIds.value]
  event.dataTransfer.setData(ENTRIES_DRAG_TYPE, JSON.stringify(ids))
  event.dataTransfer.setData('text/plain', ids.length === 1 ? (row.name || 'entry') : `${ids.length} entries`)
  event.dataTransfer.effectAllowed = 'move'
  setDragLabel(event.dataTransfer, ids.length === 1 ? (row.name || '(no name)') : `${ids.length} entries`)
}

/** Small "N entries" badge instead of the browser's snapshot of the whole row */
function setDragLabel(dataTransfer: DataTransfer, label: string) {
  const badge = document.createElement('div')
  badge.className = 'drag-badge'
  badge.textContent = label
  document.body.appendChild(badge)
  dataTransfer.setDragImage(badge, 12, 12)
  setTimeout(() => badge.remove())
}

// --- keyboard navigation ---
function selectNext() {
  const rows = pageRows.value
  if (rows.length === 0) return
  const index = rows.findIndex((row) => row.id === selectedEntry.value?.id)
  if (index === -1) {
    // Nothing selected or selection is on another page — select first
    selectedEntry.value = rows[0]
  } else if (index < rows.length - 1) {
    selectedEntry.value = rows[index + 1]
  } else if (page.value < pageCount.value) {
    // At the bottom of the page — go to next page and select first row
    goToNextPage()
    nextTick(() => {
      if (pageRows.value.length > 0) selectedEntry.value = pageRows.value[0]
    })
  }
}

function selectPrev() {
  const rows = pageRows.value
  if (rows.length === 0) return
  const index = rows.findIndex((row) => row.id === selectedEntry.value?.id)
  if (index === -1) {
    // Nothing selected or selection is on another page — select last
    selectedEntry.value = rows[rows.length - 1]
  } else if (index > 0) {
    selectedEntry.value = rows[index - 1]
  } else if (page.value > 1) {
    // At the top of the page — go to previous page and select last row
    goToPrevPage()
    nextTick(() => {
      const newRows = pageRows.value
      if (newRows.length > 0) selectedEntry.value = newRows[newRows.length - 1]
    })
  }
}

function onKeydown(event: KeyboardEvent) {
  // Only when no input is focused and no modal is open
  if (isModalOpen() || isInputFocused() || event.ctrlKey || event.altKey || event.metaKey) return
  const navigation: Record<string, () => void> = {
    ArrowDown: () => { selectNext(); collapseSelection(); dataGrid.value?.focus() },
    ArrowUp: () => { selectPrev(); collapseSelection(); dataGrid.value?.focus() },
    ArrowRight: goToNextPage,
    ArrowLeft: goToPrevPage,
    Home: goToFirstPage,
    End: goToLastPage,
  }
  const handler = navigation[event.key]
  if (handler) {
    event.preventDefault()
    handler()
  }
}

onMounted(() => {
  tableHeight.value = tableScroll.value!.clientHeight
  resizeObserver.observe(tableScroll.value!)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  resizeObserver.disconnect()
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.entry-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
/* ===== Pagination ===== */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg-elevated);
  flex-shrink: 0;
}

.pg-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--c-border);
  background: var(--c-bg-elevated);
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 16px;
}
.pg-btn:hover:not(:disabled) {
  background: var(--c-bg-hover);
  color: var(--c-text);
}
.pg-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.pg-info {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--c-text);
  min-width: 60px;
  text-align: center;
}

.pg-count {
  font-size: var(--text-xs);
  color: var(--c-text-muted);
  margin-left: var(--space-2);
}
/* ===== Table ===== */
.table-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

.data-grid {
  min-width: 600px;
  outline: none;
}

.grid-row {
  transition: background var(--transition-fast);
}

.grid-row:not(.grid-header):nth-child(even) {
  background: var(--c-bg);
}
.grid-row:not(.grid-header):nth-child(odd) {
  background: var(--c-bg-elevated);
}
.grid-row:not(.grid-header):hover {
  background: var(--c-bg-hover);
  cursor: pointer;
}
.grid-row.active {
  background: var(--c-accent) !important;
  color: white;
}
.grid-row.active * {
  color: white;
}
.grid-row.active .cell-icon {
  color: rgba(255, 255, 255, 0.7);
}
.grid-row.active a {
  color: white;
}

.grid-header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  background: var(--c-bg-elevated);
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.grid-cell {
  padding: var(--space-2) var(--space-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-sm);
  min-height: 40px;
  display: flex;
  align-items: center;
}

.grid-cell-header {
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
}

.header-label {
  font-weight: 600;
  font-size: var(--text-xs);
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-label-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  cursor: pointer;
  user-select: none;
}
.header-label-row:hover .header-label {
  color: var(--c-text);
}

.sort-icon {
  font-size: 12px;
  color: var(--c-accent);
  flex-shrink: 0;
}

.filter-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.filter-wrap--empty {
  height: 28px;
}

.filter-icon {
  position: absolute;
  left: 6px;
  font-size: 12px;
  color: var(--c-text-muted);
  pointer-events: none;
}

.filter-input {
  width: 100%;
  height: 28px;
  padding: 0 8px 0 24px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-xs);
  outline: none;
  transition: border-color var(--transition-fast);
}
.filter-input:focus {
  border-color: var(--c-accent);
}
.filter-input::placeholder {
  color: var(--c-text-muted);
}
/* ===== Cell Variants ===== */
.cell-icon {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--c-text-muted);
  opacity: 0.5;
}

.cell-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.cell-type-icon {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--c-text-muted);
}

.cell-url {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  overflow: hidden;
}

.url-link {
  color: var(--c-accent);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.url-link:hover {
  text-decoration: underline;
}

.cell-secret {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  overflow: hidden;
}

.masked {
  font-family: var(--font-mono);
  letter-spacing: 2px;
  color: var(--c-text-muted);
  user-select: none;
}

.revealed {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

/* The text shrinks with an ellipsis so the buttons next to it are never clipped */
.masked,
.revealed {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-action-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  transition: all var(--transition-fast);
  opacity: 0;
}
.grid-row:hover .cell-action-btn,
.grid-row.active .cell-action-btn {
  opacity: 1;
}
.cell-action-btn:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}
/* ===== Empty State ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  color: var(--c-text-muted);
  opacity: 0.3;
  margin-bottom: var(--space-4);
}

.empty-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--c-text-secondary);
  margin-bottom: var(--space-1);
}

.empty-sub {
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}
/* ===== Row Transitions ===== */
.row-enter-active,
.row-leave-active {
  transition: all 250ms ease;
}
.row-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}
.row-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
