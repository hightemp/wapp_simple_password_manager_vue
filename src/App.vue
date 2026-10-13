<template>
  <!-- Skip to content -->
  <a href="#main-table" class="skip-link">Skip to content</a>

  <div class="app-shell">
    <AppSidebar
      :unsaved-changes="db.unsavedChanges"
      :just-saved="justSaved"
      :is-dark-theme="isDarkTheme"
      @action="onMenuAction"
    />

    <!-- ===== Main Content ===== -->
    <main class="main-content" id="main-table">
      <!-- ===== Mobile: search + card list ===== -->
      <template v-if="isMobile">
        <div class="mobile-search">
          <div class="i-lucide-search mobile-search-icon" />
          <input
            v-model="searchQuery"
            type="search"
            class="mobile-search-input"
            placeholder="Search"
            aria-label="Search entries"
            autocomplete="off"
          />
          <button class="mobile-category-btn" aria-label="Choose category" @click="categoryPicker = { mode: 'filter' }">
            <div class="i-lucide-folder" />
            <span class="mobile-category-name">{{ categoryLabel }}</span>
          </button>
        </div>
        <div v-if="isTrashView" class="trash-bar">
          <span class="trash-bar-text">Deleted entries are removed for good after {{ TRASH_DAYS }} days</span>
          <button v-if="db.trash.length" class="action-btn action-btn--danger action-btn--sm" @click="emptyTrash">Empty trash</button>
        </div>
        <div class="mobile-list-scroll">
          <EntryCardList
            :entries="filteredRows"
            :copied-cells="copiedCells"
            :is-searching="searchQuery.trim() !== ''"
            :in-trash="isTrashView"
            @open="(entry) => (detailsEntry = entry)"
            @copy="copyField"
          />
        </div>
      </template>

      <!-- ===== Desktop: category panel + paginated table ===== -->
      <div v-else class="desktop-layout">
      <CategoryPanel />
      <div class="table-area">
      <div v-if="isTrashView" class="trash-bar">
        <div class="i-lucide-trash-2 trash-bar-icon" />
        <span class="trash-bar-text">Deleted entries are removed for good after {{ TRASH_DAYS }} days. Right-click an entry to restore it.</span>
        <button v-if="db.trash.length" class="action-btn action-btn--danger action-btn--sm" @click="emptyTrash">
          <div class="i-lucide-trash-2" /> Empty trash
        </button>
      </div>
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
                  :value="table.filter[column.key]"
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
              @click="selectRow(row, $event)"
              @dragstart="onRowDragStart($event, row)"
              @dblclick="editSelected"
              @contextmenu.prevent="openContextMenu($event, row)"
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
                    @click.stop="copyField(row, detailsCopy(row)!.key)"
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
                  <button class="cell-action-btn" @click.stop="copyField(row, mainSecret(row)!.key)" :aria-label="'Copy ' + mainSecret(row)!.label.toLowerCase()">
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
      </div>
    </main>

    <EntryContextMenu
      :entry="contextMenu.entry"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :in-trash="isTrashView"
      @copy="(field) => copyField(contextMenu.entry, field)"
      @edit="db.openEditWindow(contextMenu.entry)"
      @history="historyEntry = contextMenu.entry"
      @action="(id) => runAction(contextMenu.entry, id)"
      @restore="restoreEntries([contextMenu.entry.id])"
      @delete="deleteEntry(contextMenu.entry)"
      @close="closeContextMenu"
    />

    <KeyboardShortcutsModal v-model="showShortcuts" />
    <ChangePasswordModal v-model="showChangePassword" />

    <BottomNav
      :unsaved-changes="db.unsavedChanges"
      @action="onMenuAction"
    />
    <MobileMenuSheet v-model="showMobileMenu" :is-dark-theme="isDarkTheme" @action="onMenuAction" />
    <EntryDetailsSheet
      :entry="detailsEntry"
      :in-trash="isTrashView"
      @copy="(field) => copyField(detailsEntry, field)"
      @edit="editFromDetails"
      @change-category="categoryPicker = { mode: 'move', entry: detailsEntry! }"
      @history="historyEntry = detailsEntry"
      @action="(id) => runAction(detailsEntry, id)"
      @update-field="(key, value) => db.setEntryFields(detailsEntry!.id!, { [key]: value })"
      @restore="restoreFromDetails"
      @delete="deleteFromDetails"
      @close="detailsEntry = null"
    />
    <!-- After the details sheet so they open on top of it -->
    <QrCodeModal :qr="qrCode" @close="qrCode = null" />
    <EntryHistoryModal
      :entry="historyEntry"
      @restore="restoreHistory"
      @clear="clearHistory"
      @close="historyEntry = null"
    />
    <!-- After the details sheet so it opens on top of it -->
    <CategoryPickerSheet
      :model-value="categoryPicker !== null"
      :title="categoryPicker?.mode === 'move' ? 'Move to category' : 'Categories'"
      :selected="categoryPicker?.mode === 'move' ? (categoryPicker.entry?.category ?? '') : activeCategory"
      :show-all="categoryPicker?.mode !== 'move'"
      :show-trash="categoryPicker?.mode !== 'move'"
      @update:model-value="(open) => !open && (categoryPicker = null)"
      @pick="onCategoryPicked"
      @pick-trash="categoryPicker = null; selectTrash()"
    />
  </div>

  <input type="file" ref="importInput" class="sr-only" @change="importDatabase" />

  <EntryTypePicker v-model="showTypePicker" @pick="newEntry" />
  <ImportWizardModal v-model="showImportWizard" @imported="onImported" />
  <EntryEditModal />
  <RepoSettingsModal />
  <CreateDatabaseModal />
  <!-- After other modals so it stacks on top of them -->
  <ConfirmDialog ref="confirmDialog" />
  <NotificationToast ref="notifications" />
  <LoaderOverlay />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, useTemplateRef, provide, reactive, nextTick } from 'vue'
import { useDatabaseStore, parseDatabase, TRASH_RETENTION, SaveError, PasswordMismatchError, type Entry } from '@/stores/database'
import type { MergeStats } from '@/utils/merge'
import { useReposStore } from '@/stores/repos'
import { debounce } from '@/utils/debounce'
import { copySecret, CLIPBOARD_CLEAR_DELAY } from '@/utils/clipboard'
import { NOTIFY_KEY, type NotifyFn } from '@/composables/useNotify'
import { useMediaQuery, MOBILE_QUERY } from '@/composables/useMediaQuery'
import { useCategoryState, type CategorySelection } from '@/composables/useCategoryState'
import { isWithin, pathName, ENTRIES_DRAG_TYPE } from '@/utils/categories'
import { CONFIRM_KEY, type ConfirmFn } from '@/composables/useConfirm'
import { useTrashActions } from '@/composables/useTrashActions'
import type { MenuAction } from '@/types/menu'
import { entryType, mainSecret, entryUrl, describeField, expiryStatus, DEFAULT_TYPE, EXPIRING_FILTER, EXPIRY_WARNING_DAYS } from '@/types/entryTypes'
import { formatCardNumber } from '@/utils/card'

import AppSidebar from '@/components/AppSidebar.vue'
import BottomNav from '@/components/BottomNav.vue'
import MobileMenuSheet from '@/components/MobileMenuSheet.vue'
import EntryCardList from '@/components/EntryCardList.vue'
import EntryDetailsSheet from '@/components/EntryDetailsSheet.vue'
import CategoryPanel from '@/components/CategoryPanel.vue'
import CategoryPickerSheet from '@/components/CategoryPickerSheet.vue'
import EntryEditModal from '@/components/EntryEditModal.vue'
import EntryTypePicker from '@/components/EntryTypePicker.vue'
import ImportWizardModal from '@/components/ImportWizardModal.vue'
import EntryHistoryModal from '@/components/EntryHistoryModal.vue'
import QrCodeModal from '@/components/QrCodeModal.vue'
import ExpiryBadge from '@/components/ExpiryBadge.vue'
import EntryContextMenu from '@/components/EntryContextMenu.vue'
import RepoSettingsModal from '@/components/RepoSettingsModal.vue'
import CreateDatabaseModal from '@/components/CreateDatabaseModal.vue'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal.vue'
import NotificationToast from '@/components/NotificationToast.vue'
import LoaderOverlay from '@/components/LoaderOverlay.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000
// localStorage key kept as-is so the saved theme survives the rename
const THEME_STORAGE_KEY = 'bDarkTheme'
const TRASH_DAYS = TRASH_RETENTION / (24 * 60 * 60 * 1000)

// Table columns: the same for every entry type (see entryTypes.ts)
const TABLE_COLUMNS = [
  { key: 'name', label: 'Name', width: 'minmax(140px, 1.4fr)', filter: true },
  { key: 'details', label: 'Details', width: 'minmax(120px, 1.2fr)', filter: true },
  { key: 'secret', label: 'Secret', width: 'minmax(180px, 0.8fr)', filter: false },
  { key: 'url', label: 'URL', width: 'minmax(100px, 1fr)', filter: true },
  { key: 'description', label: 'Notes', width: 'minmax(80px, 1fr)', filter: true },
]

const db = useDatabaseStore()
const repos = useReposStore()

const importInput = useTemplateRef<HTMLInputElement>('importInput')
const notifications = useTemplateRef('notifications')
const tableScroll = useTemplateRef<HTMLElement>('tableScroll')
const dataGrid = useTemplateRef<HTMLElement>('dataGrid')

const notify: NotifyFn = (title, message, type, duration, action) => {
  notifications.value?.show(title, message, type, duration, action)
}
provide(NOTIFY_KEY, notify)

const confirmDialog = useTemplateRef('confirmDialog')
const confirmAction: ConfirmFn = (options) => confirmDialog.value?.ask(options) ?? Promise.resolve(false)
provide(CONFIRM_KEY, confirmAction)

const { moveToTrash } = useTrashActions(notify)

// --- local state ---
const selectedEntry = ref<any>(null)
const revealedRows = reactive(new Set<Entry['id']>())
const copiedCells = reactive(new Set<string>())
const isDarkTheme = ref(localStorage.getItem(THEME_STORAGE_KEY) === 'true')
const justSaved = ref(false)
const showShortcuts = ref(false)
const showChangePassword = ref(false)
const showMobileMenu = ref(false)
const showTypePicker = ref(false)
const showImportWizard = ref(false)

// Mobile layout: card list with a single search field instead of the table
const isMobile = useMediaQuery(MOBILE_QUERY)
const searchQuery = ref('')
// Entry shown in the mobile details sheet
const detailsEntry = ref<Entry | null>(null)
// Entry whose history is shown
const historyEntry = ref<Entry | null>(null)
// QR code shown by a type action (Wi-Fi)
const qrCode = ref<{ title: string; text: string; hint?: string } | null>(null)

// --- categories ---
const { selectOnly, selectTrash, trashSelected, typeFilter, effectiveSelection, effectiveSelections } = useCategoryState()
// Deleted entries are listed instead of a category
const isTrashView = computed(() => trashSelected.value)
// Primary selected category: null = all, '' = uncategorized
const activeCategory = computed(() => effectiveSelection(db.categoryPaths))
// Every selected category the list is filtered by ([null] = all entries)
const activeCategories = computed(() => effectiveSelections(db.categoryPaths))
const categoryLabel = computed(() => {
  const type = typeFilter.value === EXPIRING_FILTER ? 'Expiring' : typeFilter.value && entryType({ type: typeFilter.value }).label
  return type ? `${placeLabel.value} · ${type}` : placeLabel.value
})
const placeLabel = computed(() => {
  if (isTrashView.value) return 'Trash'
  const categories = activeCategories.value
  if (categories.length > 1) return `${categories.length} categories`
  const category = categories[0]
  if (category === null) return 'All'
  return category === '' ? 'Uncategorized' : pathName(category)
})
// Mobile category sheet: filter the list, or move one entry
const categoryPicker = ref<{ mode: 'filter' } | { mode: 'move'; entry: Entry } | null>(null)

function onCategoryPicked(path: CategorySelection) {
  const picker = categoryPicker.value
  categoryPicker.value = null
  if (picker?.mode === 'move') {
    db.moveEntries([picker.entry.id!], path ?? '')
    notify('Entry moved', path ? `to "${path}"` : 'to Uncategorized', 'success', 2000)
  } else {
    selectOnly(path)
  }
}

function inActiveCategory(entry: Entry): boolean {
  return activeCategories.value.some((category) => {
    if (category === null) return true
    if (category === '') return !entry.category
    return isWithin(entry.category ?? '', category)
  })
}
let autoLockTimer: ReturnType<typeof setTimeout> | null = null

// Sorting
const sortKey = ref<string | null>(null)
const sortAsc = ref(true)

// Context menu (shown while `entry` is set)
const contextMenu = reactive({ entry: null as any, x: 0, y: 0 })

// --- computed ---
const table = computed(() => db.table)

const gridStyle = { display: 'grid', gridTemplateColumns: TABLE_COLUMNS.map((column) => column.width).join(' ') }

/** Text of a table column for an entry (used for display, filtering and sorting) */
function cellValue(entry: Entry, key: string): string {
  switch (key) {
    case 'details': return entryType(entry).details(entry)
    case 'secret': return mainSecret(entry)?.value ?? ''
    case 'url': return entryUrl(entry)
    default: return String(entry[key] ?? '')
  }
}

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

// Height of the scrollable table area, kept up to date by a ResizeObserver
const tableHeight = ref(window.innerHeight - 100)
let tableResizeObserver: ResizeObserver | null = null

const rowsPerPage = computed(() => Math.max(1, Math.floor((tableHeight.value - 60) / 40)))

const page = computed({
  get: () => table.value.page ?? 1,
  set: (value) => { table.value.page = Number(value) },
})

// Search covers every field of an entry, custom ones included
function matchesSearch(entry: Entry, query: string): boolean {
  return Object.entries(entry).some(([key, value]) =>
    key !== 'type' && typeof value === 'string' && value.toLowerCase().includes(query))
}

const filteredRows = computed(() => {
  let rows = isTrashView.value
    ? db.trash.map((item) => item.entry)
    : table.value.data.filter(inActiveCategory)
  if (typeFilter.value === EXPIRING_FILTER) rows = rows.filter((entry) => expiryStatus(entry))
  else if (typeFilter.value) rows = rows.filter((entry) => entryType(entry).id === typeFilter.value)
  if (isMobile.value) {
    // Column filters are not visible on mobile — use the search field only
    const query = searchQuery.value.trim().toLowerCase()
    if (query) rows = rows.filter((entry) => matchesSearch(entry, query))
  } else {
    // Only filters of visible columns apply (a stored filter on a hidden column is ignored)
    const filter = table.value.filter
    const keys = TABLE_COLUMNS.filter((column) => column.filter && filter[column.key]).map((column) => column.key)
    rows = rows.filter((entry) => keys.every((key) => cellValue(entry, key).includes(filter[key])))
  }

  if (sortKey.value) {
    const key = sortKey.value
    const direction = sortAsc.value ? 1 : -1
    rows = [...rows].sort((a: any, b: any) => {
      const left = cellValue(a, key).toLowerCase()
      const right = cellValue(b, key).toLowerCase()
      if (left < right) return -direction
      if (left > right) return direction
      return 0
    })
  }

  return rows
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / rowsPerPage.value)))

// Keep the current page in range when rows are filtered out or the window grows
watch(pageCount, (count) => {
  if (page.value > count) page.value = count
})

const pageRows = computed(() =>
  filteredRows.value.slice((page.value - 1) * rowsPerPage.value, page.value * rowsPerPage.value)
)

// --- pagination ---
function goToFirstPage() { page.value = 1 }
function goToPrevPage() { if (page.value > 1) page.value -= 1 }
function goToLastPage() { page.value = pageCount.value }
function goToNextPage() { if (page.value < pageCount.value) page.value += 1 }

// --- table ---
async function copyField(entry: any, field: string) {
  const raw = entry?.[field] ?? ''
  // Card numbers are stored with spaces for reading; copy the digits
  const text = describeField(entry ?? {}, field).kind === 'card_number' ? raw.replace(/\D/g, '') : raw
  if (!text) return
  try {
    await copySecret(text)
  } catch (_) {
    notify('Copy failed', 'The browser blocked clipboard access', 'error')
    return
  }
  const cellKey = `${field}-${entry.id}`
  copiedCells.add(cellKey)
  setTimeout(() => copiedCells.delete(cellKey), 1500)
  notify('Copied', `Clipboard will be cleared in ${CLIPBOARD_CLEAR_DELAY / 1000} s`, 'success', 2000)
}

function togglePasswordVisibility(rowId: Entry['id']) {
  if (revealedRows.has(rowId)) {
    revealedRows.delete(rowId)
  } else {
    revealedRows.add(rowId)
    setTimeout(() => revealedRows.delete(rowId), 3000)
  }
}

function toggleSort(key: string) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

const onFilterInput = debounce((event: Event, key: string) => {
  db.setFilter(key, (event.target as HTMLInputElement).value)
  // Reset to page 1 when filter changes so rows aren't out of range
  page.value = 1
}, 300)

function openContextMenu(event: MouseEvent, row: any) {
  if (!selectedIds.value.has(row.id)) selectSingle(row)
  contextMenu.entry = row
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
}

function closeContextMenu() {
  contextMenu.entry = null
}

// --- selection ---
// --- multi-selection: Ctrl/⌘+click toggles, Shift+click selects a range ---
const selectedIds = ref(new Set<number>())
let anchorId: number | null = null

// Any single selection (keyboard, context menu, …) replaces the multi-selection
// After unlocking, remind about entries that expire soon or have expired
watch(() => db.isLoading, (loading, wasLoading) => {
  if (loading || !wasLoading || db.isRepoWindowOpen || !db.masterPassword) return
  const expiring = db.table.data.filter((entry) => expiryStatus(entry))
  if (!expiring.length) return
  const expired = expiring.filter((entry) => expiryStatus(entry) === 'expired').length
  notify(
    `${expiring.length} ${expiring.length === 1 ? 'entry expires' : 'entries expire'} soon`,
    expired ? `${expired} already expired` : `Within ${EXPIRY_WARNING_DAYS} days`,
    'info',
    10000,
    { label: 'Show', run: () => { selectOnly(null); typeFilter.value = EXPIRING_FILTER } },
  )
})

watch(selectedEntry, (entry) => {
  if (!entry) selectedIds.value = new Set()
  else if (!selectedIds.value.has(entry.id)) selectedIds.value = new Set([entry.id])
})

// Drop selected rows that left the list (moved to or out of the trash, deleted, …)
watch([() => table.value.data, () => db.trash, isTrashView], () => {
  const listed = new Set(filteredRows.value.map((entry) => entry.id))
  if ([...selectedIds.value].every((id) => listed.has(id))) return
  selectedIds.value = new Set([...selectedIds.value].filter((id) => listed.has(id)))
  if (selectedEntry.value && !listed.has(selectedEntry.value.id)) selectedEntry.value = null
})

/** Keyboard navigation works on a single row */
function collapseSelection() {
  const entry = selectedEntry.value
  selectedIds.value = new Set(entry ? [entry.id] : [])
}

function selectSingle(row: any) {
  selectedIds.value = new Set([row.id])
  selectedEntry.value = row
  anchorId = row.id
}

function selectRow(row: any, event?: MouseEvent) {
  if (event && (event.ctrlKey || event.metaKey)) {
    const ids = new Set(selectedIds.value)
    if (ids.has(row.id)) {
      ids.delete(row.id)
      selectedIds.value = ids
      if (selectedEntry.value?.id === row.id) {
        const nextId = [...ids].pop()
        selectedEntry.value = table.value.data.find((entry) => entry.id === nextId) ?? null
      }
    } else {
      ids.add(row.id)
      selectedIds.value = ids
      selectedEntry.value = row
    }
    anchorId = row.id
  } else if (event?.shiftKey && anchorId !== null) {
    const rows = filteredRows.value
    const from = rows.findIndex((entry) => entry.id === anchorId)
    const to = rows.findIndex((entry) => entry.id === row.id)
    if (from === -1) {
      selectSingle(row)
    } else {
      const [start, end] = from < to ? [from, to] : [to, from]
      selectedIds.value = new Set(rows.slice(start, end + 1).map((entry) => entry.id!))
      selectedEntry.value = row
    }
  } else {
    selectSingle(row)
  }
  // Focus the grid so keyboard navigation works
  dataGrid.value?.focus()
}

function onRowDragStart(event: DragEvent, row: any) {
  if (!event.dataTransfer) return
  // Dragging an unselected row drags just that row
  if (!selectedIds.value.has(row.id)) selectSingle(row)
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

function selectNext() {
  const rows = pageRows.value
  if (rows.length === 0) return
  const index = rows.findIndex((row: any) => row.id === selectedEntry.value?.id)
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
  const index = rows.findIndex((row: any) => row.id === selectedEntry.value?.id)
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

// --- entry actions ---
/** Ask for the type of the new entry (or use the type the list is filtered by) */
function addEntry() {
  if (typeFilter.value && typeFilter.value !== EXPIRING_FILTER) newEntry(typeFilter.value)
  else showTypePicker.value = true
}

function newEntry(type = DEFAULT_TYPE) {
  // A new entry would be invisible in the trash
  if (isTrashView.value) selectOnly(null)
  db.openEditWindow({}, type)
}

function notifyNoSelection() {
  notify('No entry selected', 'Click a row in the table first', 'info')
}

function editSelected() {
  if (isTrashView.value && selectedEntry.value) {
    notify('Entry is in the trash', 'Restore it to edit', 'info')
  } else if (selectedEntry.value) {
    db.openEditWindow(selectedEntry.value)
  } else {
    notifyNoSelection()
  }
}

/**
 * Move an entry to the trash (no confirmation — it can be undone), or delete it for good
 * when the trash is shown (asks first). Resolves to true when the entry was removed.
 */
async function deleteEntry(entry: any): Promise<boolean> {
  if (!entry) return false
  if (isTrashView.value) return deleteForever([entry.id], entry.name)
  moveToTrash([entry.id], entry.name)
  return true
}

async function deleteForever(ids: number[], name?: string): Promise<boolean> {
  const confirmed = await confirmAction({
    title: 'Delete forever',
    message: ids.length > 1
      ? `Delete ${ids.length} entries for good? This cannot be undone.`
      : `Delete ${name ? `"${name}"` : 'this entry'} for good? This cannot be undone.`,
    confirmText: 'Delete forever',
    danger: true,
  })
  if (!confirmed) return false
  db.deleteForever(ids)
  return true
}

function restoreEntries(ids: number[]) {
  db.restoreFromTrash(ids)
  notify(ids.length === 1 ? 'Entry restored' : `${ids.length} entries restored`, undefined, 'success', 2000)
}

async function emptyTrash() {
  const count = db.trash.length
  const confirmed = await confirmAction({
    title: 'Empty trash',
    message: `Delete ${count} ${count === 1 ? 'entry' : 'entries'} in the trash for good? This cannot be undone.`,
    confirmText: 'Empty trash',
    danger: true,
  })
  if (confirmed) db.emptyTrash()
}

function restoreFromDetails() {
  const entry = detailsEntry.value
  detailsEntry.value = null
  if (entry) restoreEntries([entry.id!])
}

/** Run an extra action of the entry's type: copy a composed text or show a QR code */
async function runAction(entry: Entry | null, id: string) {
  const action = entry && entryType(entry).actions?.find((a) => a.id === id)
  if (!entry || !action) return
  if (action.qr) {
    qrCode.value = {
      title: entry.name || action.label,
      text: action.qr(entry),
      hint: 'Point the phone camera at the code to join the network. The code contains the password — show it only to people you trust.',
    }
    return
  }
  if (action.copy) {
    try {
      await copySecret(action.copy(entry))
    } catch (_) {
      notify('Copy failed', 'The browser blocked clipboard access', 'error')
      return
    }
    notify('Copied', action.label.replace(/^Copy /, ''), 'success', 2000)
  }
}

// --- import from other apps ---
function openImportWizard() {
  if (!db.masterPassword) {
    notify('Not connected', 'Connect to a repository first', 'error')
    return
  }
  showImportWizard.value = true
}

function onImported(ids: number[], source: string, fileName: string) {
  // Show where the entries went
  selectOnly(null)
  typeFilter.value = null
  notify(
    `Imported ${ids.length} ${ids.length === 1 ? 'entry' : 'entries'} from ${source}`,
    `Press Save to store them. Then delete "${fileName}" — it holds your passwords in plain text.`,
    'success',
    12000,
    { label: 'Undo', run: () => db.discardEntries(ids) },
  )
}

// --- history ---
function restoreHistory(fields: Record<string, string>) {
  const entry = historyEntry.value
  if (!entry) return
  db.restoreFields(entry.id!, fields)
  notify('Restored', Object.keys(fields).length === 1 ? `${describeField(entry, Object.keys(fields)[0]).label} restored` : 'Previous version restored', 'success', 2000)
}

function clearHistory() {
  const entry = historyEntry.value
  if (entry) db.clearHistory(entry.id!)
}

function editFromDetails() {
  const entry = detailsEntry.value
  detailsEntry.value = null
  if (entry) db.openEditWindow(entry)
}

async function deleteFromDetails() {
  if (await deleteEntry(detailsEntry.value)) detailsEntry.value = null
}

async function deleteSelected() {
  const ids = [...selectedIds.value]
  if (ids.length > 1) {
    if (isTrashView.value) await deleteForever(ids)
    else moveToTrash(ids)
  } else if (selectedEntry.value) {
    deleteEntry(selectedEntry.value)
  } else {
    notifyNoSelection()
  }
}

async function saveAll({ overwrite = false } = {}) {
  let merged: MergeStats | null
  try {
    ({ merged } = await db.saveToAllRepos({ overwrite }))
  } catch (error) {
    if (!overwrite && error instanceof SaveError && error.failures.some((f) => f.error instanceof PasswordMismatchError)) {
      await offerOverwrite()
      return
    }
    notify('Save failed', error instanceof Error ? error.message : String(error), 'error', 8000)
    return
  }
  justSaved.value = true
  setTimeout(() => { justSaved.value = false }, 2000)
  if (merged) {
    afterMerge()
    notify('Saved — merged changes from another device', describeMerge(merged), 'success', 8000)
  } else {
    notify('Saved', 'Data has been saved', 'success')
  }
}

/** The repo's file was saved elsewhere with another master password: it can't be merged */
async function offerOverwrite() {
  const confirmed = await confirmAction({
    title: 'Database changed elsewhere',
    message: `The database in "${repos.currentRepo?.name}" was changed on another device and saved with a different master password, so the changes can't be merged.\n\n` +
      'Overwrite it with the database open here (the other version is kept as a local backup), or cancel and reconnect with the other master password to see it.',
    confirmText: 'Overwrite',
    danger: true,
  })
  if (confirmed) await saveAll({ overwrite: true })
}

function describeMerge(stats: MergeStats): string {
  const parts = [
    stats.added && `${stats.added} added`,
    stats.updated && `${stats.updated} updated`,
    stats.removed && `${stats.removed} removed`,
  ].filter(Boolean)
  let text = parts.length ? `Entries from there: ${parts.join(', ')}.` : 'No entries changed there.'
  if (stats.conflicts) {
    text += ` ${stats.conflicts} field${stats.conflicts === 1 ? ' was' : 's were'} changed on both sides — your values are kept, theirs are in the entry history.`
  }
  return text
}

/** Merging replaced the entry objects: drop references to the old ones */
function afterMerge() {
  const byId = new Map(db.table.data.map((entry) => [entry.id, entry]))
  selectedEntry.value = byId.get(selectedEntry.value?.id) ?? null
  detailsEntry.value = null
  historyEntry.value = null
  closeContextMenu()
}

function openChangePassword() {
  if (!db.masterPassword) {
    notify('Not connected', 'Connect to a repository first', 'error')
    return
  }
  showChangePassword.value = true
}

async function importDatabase() {
  const input = importInput.value
  const file = input?.files?.[0]
  if (!input || !file) return

  try {
    const json = await file.text()
    // Validate before asking, so an invalid file never prompts to overwrite
    const imported = parseDatabase(json)
    const currentCount = table.value.data.length
    const importedCount = imported.table.data.length
    if (currentCount > 0 && !await confirmAction({
      title: 'Replace database',
      message: `Replace the current ${currentCount} entries with ${importedCount} entries from "${file.name}"?\n\n` +
        'The change is not saved to repositories until you press Save.',
      confirmText: 'Replace',
      danger: true,
    })) return

    db.importDatabase(json)
    selectedEntry.value = null
    revealedRows.clear()
    notify('Imported', `${importedCount} entries loaded — press Save to store them`, 'success')
  } catch (error) {
    notify('Import failed', error instanceof Error ? error.message : String(error), 'error', 8000)
  } finally {
    // Allow picking the same file again
    input.value = ''
  }
}

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value
  localStorage.setItem(THEME_STORAGE_KEY, String(isDarkTheme.value))
  document.documentElement.setAttribute('data-theme', isDarkTheme.value ? 'dark' : 'light')
}

function onMenuAction(action: MenuAction) {
  switch (action) {
    case 'repo-window': db.isRepoWindowOpen = true; break
    case 'save': saveAll(); break
    case 'change-password': openChangePassword(); break
    case 'add': addEntry(); break
    case 'edit': editSelected(); break
    case 'remove': deleteSelected(); break
    case 'export': db.exportDatabase(); break
    case 'import': importInput.value?.click(); break
    case 'import-other': openImportWizard(); break
    case 'shortcuts': showShortcuts.value = true; break
    case 'toggle-theme': toggleTheme(); break
    case 'more': showMobileMenu.value = true; break
    case 'lock': lockApp(); break
  }
}

// --- auto lock ---
function resetAutoLock() {
  if (autoLockTimer) clearTimeout(autoLockTimer)
  autoLockTimer = setTimeout(lockApp, AUTO_LOCK_TIMEOUT)
}

async function lockApp() {
  if (!db.masterPassword) return
  selectedEntry.value = null
  revealedRows.clear()
  closeContextMenu()
  showChangePassword.value = false
  showMobileMenu.value = false
  detailsEntry.value = null
  historyEntry.value = null
  qrCode.value = null
  showTypePicker.value = false
  showImportWizard.value = false
  categoryPicker.value = null
  searchQuery.value = ''
  try {
    await db.lock()
  } catch (error) {
    notify(
      'Locked — unsaved changes were lost',
      error instanceof Error ? error.message : String(error),
      'error',
      15000,
    )
  }
}

// --- keyboard ---
function isInputFocused() {
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

function isModalOpen() {
  return document.querySelector('.modal-overlay') !== null
}

function onKeydown(event: KeyboardEvent) {
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    saveAll()
  }
  if (event.ctrlKey && event.key === 'n') {
    event.preventDefault()
    newEntry()
  }
  if (event.ctrlKey && event.key === 'f') {
    event.preventDefault()
    document.querySelector<HTMLInputElement>('.filter-input')?.focus()
  }
  // Table shortcuts below must not fire behind an open modal
  if (isModalOpen()) return

  if (event.key === 'Delete' && !event.ctrlKey && !event.altKey && !isInputFocused()) {
    deleteSelected()
  }
  if (event.key === 'Enter' && !event.ctrlKey && !event.altKey && !isInputFocused()) {
    event.preventDefault()
    editSelected()
  }
  if (event.key === 'Escape') {
    selectedEntry.value = null
    closeContextMenu()
  }

  // Arrow key navigation (only when no input/textarea is focused)
  if (!isInputFocused() && !event.ctrlKey && !event.altKey && !event.metaKey) {
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
}

// --- lifecycle ---
onMounted(() => {
  repos.loadRepos()

  tableResizeObserver = new ResizeObserver(([entry]) => {
    tableHeight.value = entry.contentRect.height
  })
  // The table element is recreated when switching between mobile and desktop layouts
  watch(tableScroll, (element, previous) => {
    if (previous) tableResizeObserver?.unobserve(previous)
    if (element) {
      tableHeight.value = element.clientHeight
      tableResizeObserver?.observe(element)
    }
  }, { immediate: true })

  if (isDarkTheme.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', closeContextMenu)
  for (const eventName of ['mousemove', 'keydown', 'click']) {
    document.addEventListener(eventName, resetAutoLock)
  }
  resetAutoLock()
})

onUnmounted(() => {
  tableResizeObserver?.disconnect()
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', closeContextMenu)
  for (const eventName of ['mousemove', 'keydown', 'click']) {
    document.removeEventListener(eventName, resetAutoLock)
  }
  if (autoLockTimer) clearTimeout(autoLockTimer)
})
</script>

<style scoped>
/* ===== Skip to content ===== */
.skip-link {
  position: absolute;
  top: -100%;
  left: var(--space-4);
  padding: var(--space-2) var(--space-4);
  background: var(--c-accent);
  color: white;
  border-radius: var(--radius-md);
  z-index: 999;
  font-size: var(--text-sm);
  text-decoration: none;
  transition: top 200ms;
}
.skip-link:focus {
  top: var(--space-2);
}
/* ===== App Shell ===== */
.app-shell {
  position: fixed;
  inset: 0;
  display: flex;
  background: var(--c-bg);
}
/* ===== Main Content ===== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
/* ===== Pagination ===== */
.trash-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--c-border);
  background: color-mix(in srgb, var(--c-danger) 6%, var(--c-bg-elevated));
  flex-shrink: 0;
}

.trash-bar-icon {
  flex-shrink: 0;
  color: var(--c-danger);
}

.trash-bar-text {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
}

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
/* ===== Screen reader only ===== */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
/* ===== Desktop: category panel + table ===== */
.desktop-layout {
  flex: 1;
  display: flex;
  min-height: 0;
}

.table-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

/* ===== Mobile: search + card list ===== */
.mobile-search {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--c-bg-elevated);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}

.mobile-search-icon {
  position: absolute;
  left: calc(var(--space-3) + 12px);
  font-size: 18px;
  color: var(--c-text-muted);
  pointer-events: none;
}

.mobile-search-input {
  width: 100%;
  height: 44px;
  padding: 0 var(--space-3) 0 40px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text);
  outline: none;
}
.mobile-search-input:focus {
  border-color: var(--c-accent);
}

.mobile-category-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  max-width: 40%;
  height: 44px;
  margin-left: var(--space-2);
  padding: 0 var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text-secondary);
  font-size: var(--text-base);
}

.mobile-category-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mobile-list-scroll {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .app-shell {
    padding-top: env(safe-area-inset-top);
    padding-bottom: calc(56px + env(safe-area-inset-bottom));
  }
}
</style>
