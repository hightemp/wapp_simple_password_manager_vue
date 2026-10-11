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
        </div>
        <div class="mobile-list-scroll">
          <EntryCardList
            :entries="filteredRows"
            :copied-cells="copiedCells"
            :is-searching="searchQuery.trim() !== ''"
            @open="(entry) => (detailsEntry = entry)"
            @copy="copyField"
          />
        </div>
      </template>

      <!-- ===== Desktop: paginated table ===== -->
      <template v-else>
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
              v-for="(column, key) in columns"
              :key="key"
              class="grid-cell grid-cell-header"
              role="columnheader"
              @click="toggleSort(key as string)"
              :aria-sort="sortKey === key ? (sortAsc ? 'ascending' : 'descending') : 'none'"
            >
              <div class="header-label-row">
                <span class="header-label">{{ column.label }}</span>
                <div v-if="sortKey === key" :class="sortAsc ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="sort-icon" />
              </div>
              <div class="filter-wrap">
                <div class="i-lucide-search filter-icon" />
                <input
                  type="text"
                  class="filter-input"
                  placeholder="Filter..."
                  :value="table.filter[key]"
                  @input="(event) => onFilterInput(event, key as string)"
                  @click.stop
                  autocomplete="off"
                />
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="pageRows.length === 0" class="empty-state">
            <div class="i-lucide-database empty-icon" />
            <p class="empty-title">No entries</p>
            <p class="empty-sub">Click <strong>Add</strong> to create your first entry</p>
          </div>

          <!-- Rows -->
          <TransitionGroup name="row">
            <div
              v-for="(row, index) in pageRows"
              :key="row.id ?? index"
              :class="['grid-row', { active: selectedEntry && selectedEntry.id === row.id }]"
              :style="gridStyle"
              role="row"
              @click="selectRow(row)"
              @dblclick="editSelected"
              @contextmenu.prevent="openContextMenu($event, row)"
            >
              <div v-for="(column, key) in columns" :key="key" class="grid-cell" role="gridcell">
                <!-- URL -->
                <template v-if="row[key] && key === 'url'">
                  <div class="cell-url">
                    <div class="i-lucide-external-link cell-icon" />
                    <a :href="row[key]" target="_blank" rel="noopener" class="url-link">{{ row[key] }}</a>
                  </div>
                </template>
                <!-- Password -->
                <template v-else-if="key === 'password' && row[key]">
                  <div class="cell-secret">
                    <div class="i-lucide-lock cell-icon" />
                    <span v-if="!revealedRows.has(row.id)" class="masked">••••••••</span>
                    <span v-else class="revealed">{{ row[key] }}</span>
                    <button class="cell-action-btn" @click.stop="togglePasswordVisibility(row.id)" :aria-label="revealedRows.has(row.id) ? 'Hide password' : 'Show password'">
                      <div :class="revealedRows.has(row.id) ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
                    </button>
                    <button class="cell-action-btn" @click.stop="copyField(row, 'password')" aria-label="Copy password">
                      <div :class="copiedCells.has('password-' + row.id) ? 'i-lucide-check' : 'i-lucide-copy'" :style="copiedCells.has('password-' + row.id) ? 'color:var(--c-success)' : ''" />
                    </button>
                  </div>
                </template>
                <!-- Login -->
                <template v-else-if="key === 'login' && row[key]">
                  <div class="cell-secret">
                    <div class="i-lucide-user cell-icon" />
                    <span class="cell-text">{{ row[key] }}</span>
                    <button class="cell-action-btn" @click.stop="copyField(row, 'login')" aria-label="Copy login">
                      <div :class="copiedCells.has('login-' + row.id) ? 'i-lucide-check' : 'i-lucide-copy'" :style="copiedCells.has('login-' + row.id) ? 'color:var(--c-success)' : ''" />
                    </button>
                  </div>
                </template>
                <!-- Default -->
                <template v-else>
                  <span class="cell-text">{{ row[key] }}</span>
                </template>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>

      </template>
    </main>

    <EntryContextMenu
      :entry="contextMenu.entry"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @copy="(field) => copyField(contextMenu.entry, field)"
      @edit="db.openEditWindow(contextMenu.entry)"
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
      @copy="(field) => copyField(detailsEntry, field)"
      @edit="editFromDetails"
      @delete="deleteFromDetails"
      @close="detailsEntry = null"
    />
  </div>

  <input type="file" ref="importInput" class="sr-only" @change="importDatabase" />

  <EntryEditModal title="Edit Entry" />
  <RepoSettingsModal />
  <!-- After other modals so it stacks on top of them -->
  <ConfirmDialog ref="confirmDialog" />
  <NotificationToast ref="notifications" />
  <LoaderOverlay />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, useTemplateRef, provide, reactive, nextTick } from 'vue'
import { useDatabaseStore, parseDatabase, type Entry } from '@/stores/database'
import { useReposStore } from '@/stores/repos'
import { debounce } from '@/utils/debounce'
import { copySecret, CLIPBOARD_CLEAR_DELAY } from '@/utils/clipboard'
import { NOTIFY_KEY, type NotifyFn } from '@/composables/useNotify'
import { useMediaQuery, MOBILE_QUERY } from '@/composables/useMediaQuery'
import { CONFIRM_KEY, type ConfirmFn } from '@/composables/useConfirm'
import type { MenuAction } from '@/types/menu'

import AppSidebar from '@/components/AppSidebar.vue'
import BottomNav from '@/components/BottomNav.vue'
import MobileMenuSheet from '@/components/MobileMenuSheet.vue'
import EntryCardList from '@/components/EntryCardList.vue'
import EntryDetailsSheet from '@/components/EntryDetailsSheet.vue'
import EntryEditModal from '@/components/EntryEditModal.vue'
import EntryContextMenu from '@/components/EntryContextMenu.vue'
import RepoSettingsModal from '@/components/RepoSettingsModal.vue'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal.vue'
import NotificationToast from '@/components/NotificationToast.vue'
import LoaderOverlay from '@/components/LoaderOverlay.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const AUTO_LOCK_TIMEOUT = 5 * 60 * 1000
// localStorage key kept as-is so the saved theme survives the rename
const THEME_STORAGE_KEY = 'bDarkTheme'

const COLUMN_WIDTHS: Record<string, string> = {
  category: '120px',
  name: 'minmax(120px, 1.5fr)',
  login: 'minmax(100px, 1fr)',
  password: 'minmax(180px, 0.8fr)',
  url: 'minmax(100px, 1.2fr)',
}

const db = useDatabaseStore()
const repos = useReposStore()

const importInput = useTemplateRef<HTMLInputElement>('importInput')
const notifications = useTemplateRef('notifications')
const tableScroll = useTemplateRef<HTMLElement>('tableScroll')
const dataGrid = useTemplateRef<HTMLElement>('dataGrid')

const notify: NotifyFn = (title, message, type, duration) => {
  notifications.value?.show(title, message, type, duration)
}
provide(NOTIFY_KEY, notify)

const confirmDialog = useTemplateRef('confirmDialog')
const confirmAction: ConfirmFn = (options) => confirmDialog.value?.ask(options) ?? Promise.resolve(false)
provide(CONFIRM_KEY, confirmAction)

// --- local state ---
const selectedEntry = ref<any>(null)
const revealedRows = reactive(new Set<Entry['id']>())
const copiedCells = reactive(new Set<string>())
const isDarkTheme = ref(localStorage.getItem(THEME_STORAGE_KEY) === 'true')
const justSaved = ref(false)
const showShortcuts = ref(false)
const showChangePassword = ref(false)
const showMobileMenu = ref(false)

// Mobile layout: card list with a single search field instead of the table
const isMobile = useMediaQuery(MOBILE_QUERY)
const searchQuery = ref('')
// Entry shown in the mobile details sheet
const detailsEntry = ref<Entry | null>(null)
let autoLockTimer: ReturnType<typeof setTimeout> | null = null

// Sorting
const sortKey = ref<string | null>(null)
const sortAsc = ref(true)

// Context menu (shown while `entry` is set)
const contextMenu = reactive({ entry: null as any, x: 0, y: 0 })

// --- computed ---
const columns = computed(() => db.columns)
const table = computed(() => db.table)

const gridStyle = computed(() => {
  const widths = Object.keys(columns.value).map((key) => COLUMN_WIDTHS[key] ?? 'minmax(80px, 1fr)')
  return { display: 'grid', gridTemplateColumns: widths.join(' ') }
})

// Height of the scrollable table area, kept up to date by a ResizeObserver
const tableHeight = ref(window.innerHeight - 100)
let tableResizeObserver: ResizeObserver | null = null

const rowsPerPage = computed(() => Math.max(1, Math.floor((tableHeight.value - 60) / 40)))

const page = computed({
  get: () => table.value.page ?? 1,
  set: (value) => { table.value.page = Number(value) },
})

function matchesSearch(entry: Entry, query: string): boolean {
  return Object.keys(db.columns).some((key) => String(entry[key] ?? '').toLowerCase().includes(query))
}

const filteredRows = computed(() => {
  let rows: Entry[]
  if (isMobile.value) {
    // Column filters are not visible on mobile — use the search field only
    const query = searchQuery.value.trim().toLowerCase()
    rows = query ? table.value.data.filter((entry) => matchesSearch(entry, query)) : table.value.data
  } else {
    const filter = table.value.filter
    rows = table.value.data.filter((entry) =>
      Object.keys(filter).every((key) => !filter[key] || String(entry[key] ?? '').includes(filter[key]))
    )
  }

  if (sortKey.value) {
    const key = sortKey.value
    const direction = sortAsc.value ? 1 : -1
    rows = [...rows].sort((a: any, b: any) => {
      const left = (a[key] ?? '').toString().toLowerCase()
      const right = (b[key] ?? '').toString().toLowerCase()
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
async function copyField(entry: any, field: 'login' | 'password') {
  const text = entry?.[field]
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
  selectedEntry.value = row
  contextMenu.entry = row
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
}

function closeContextMenu() {
  contextMenu.entry = null
}

// --- selection ---
function selectRow(row: any) {
  selectedEntry.value = row
  // Focus the grid so keyboard navigation works
  dataGrid.value?.focus()
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
function addEntry() {
  db.openEditWindow({})
}

function notifyNoSelection() {
  notify('No entry selected', 'Click a row in the table first', 'info')
}

function editSelected() {
  if (selectedEntry.value) {
    db.openEditWindow(selectedEntry.value)
  } else {
    notifyNoSelection()
  }
}

/** Ask, then delete; resolves to true when the entry was deleted */
async function deleteEntry(entry: any): Promise<boolean> {
  if (!entry) return false
  const confirmed = await confirmAction({
    title: 'Delete entry',
    message: entry.name ? `Delete "${entry.name}"?` : 'Delete this entry?',
    confirmText: 'Delete',
    danger: true,
  })
  if (!confirmed) return false
  db.removeEntry(entry)
  if (selectedEntry.value?.id === entry.id) selectedEntry.value = null
  return true
}

function editFromDetails() {
  const entry = detailsEntry.value
  detailsEntry.value = null
  if (entry) db.openEditWindow(entry)
}

async function deleteFromDetails() {
  if (await deleteEntry(detailsEntry.value)) detailsEntry.value = null
}

function deleteSelected() {
  if (selectedEntry.value) {
    deleteEntry(selectedEntry.value)
  } else {
    notifyNoSelection()
  }
}

async function saveAll() {
  try {
    await db.saveToAllRepos()
  } catch (error) {
    notify('Save failed', error instanceof Error ? error.message : String(error), 'error', 8000)
    return
  }
  justSaved.value = true
  setTimeout(() => { justSaved.value = false }, 2000)
  notify('Saved', 'Data has been saved', 'success')
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
    addEntry()
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
      ArrowDown: () => { selectNext(); dataGrid.value?.focus() },
      ArrowUp: () => { selectPrev(); dataGrid.value?.focus() },
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
