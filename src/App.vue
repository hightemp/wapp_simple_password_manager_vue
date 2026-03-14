<template>
  <!-- Skip to content -->
  <a href="#main-table" class="skip-link">Skip to content</a>

  <div class="app-shell">
    <!-- ===== Sidebar ===== -->
    <aside class="sidebar">
      <div class="sidebar-group">
        <button
          v-for="item in menuTop"
          :key="item.id"
          class="sidebar-btn"
          :title="item.title"
          :aria-label="item.title"
          @click="fnClickLeftMenu(item)"
        >
          <div v-if="item.id === 'save'" :class="bSaveAnim ? 'i-lucide-check' : item.icon" :style="bSaveAnim ? 'color:var(--c-success)' : ''" />
          <div v-else :class="item.icon" />
          <span v-if="item.id === 'save' && db.iUnsavedChanges && !bSaveAnim" class="sidebar-badge" />
        </button>
      </div>

      <div class="sidebar-group">
        <button
          v-for="item in menuData"
          :key="item.id"
          class="sidebar-btn"
          :title="item.title"
          :aria-label="item.title"
          @click="fnClickLeftMenu(item)"
        >
          <div :class="item.icon" />
        </button>
        <button class="sidebar-btn" title="Import" aria-label="Import" @click="fnTriggerImport">
          <div class="i-lucide-upload" />
          <input type="file" ref="file_selector" class="sr-only" @change="fnFileImportChange" />
        </button>
      </div>

      <div class="sidebar-spacer" />

      <div class="sidebar-group">
        <button class="sidebar-btn" title="Keyboard Shortcuts" aria-label="Keyboard Shortcuts" @click="bShowShortcuts = true">
          <div class="i-lucide-keyboard" />
        </button>
        <button class="sidebar-btn" :title="themeLabel" :aria-label="themeLabel" @click="fnToggleTheme">
          <div :class="bDarkTheme ? 'i-lucide-sun' : 'i-lucide-moon'" />
        </button>
      </div>
    </aside>

    <!-- ===== Main Content ===== -->
    <main class="main-content" id="main-table">
      <!-- Pagination bar -->
      <div class="pagination-bar" v-if="iMaxPages > 1">
        <button class="pg-btn" @click="fnFirst" :disabled="iPage <= 1" aria-label="First page">
          <div class="i-lucide-chevrons-left" />
        </button>
        <button class="pg-btn" @click="fnPrev" :disabled="iPage <= 1" aria-label="Previous page">
          <div class="i-lucide-chevron-left" />
        </button>
        <span class="pg-info">{{ iPage }} / {{ iMaxPages }}</span>
        <button class="pg-btn" @click="fnNext" :disabled="iPage >= iMaxPages" aria-label="Next page">
          <div class="i-lucide-chevron-right" />
        </button>
        <button class="pg-btn" @click="fnLast" :disabled="iPage >= iMaxPages" aria-label="Last page">
          <div class="i-lucide-chevrons-right" />
        </button>
        <span class="pg-count">{{ aRows.length }} entries</span>
      </div>

      <!-- Data table -->
      <div class="table-scroll" ref="tableScrollRef">
        <div class="data-grid" role="grid">
          <!-- Header -->
          <div class="grid-row grid-header" :style="gridStyle" role="row">
            <div
              v-for="(oSF, sK) in oStruct"
              :key="sK"
              class="grid-cell grid-cell-header"
              role="columnheader"
              @click="fnSort(sK as string)"
              :aria-sort="sortKey === sK ? (sortAsc ? 'ascending' : 'descending') : 'none'"
            >
              <div class="header-label-row">
                <span class="header-label">{{ oSF.label }}</span>
                <div v-if="sortKey === sK" :class="sortAsc ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="sort-icon" />
              </div>
              <div class="filter-wrap">
                <div class="i-lucide-search filter-icon" />
                <input
                  type="text"
                  class="filter-input"
                  placeholder="Filter..."
                  :value="oTable.filter[sK]"
                  @input="(oE) => fnFilterInput(oE, sK)"
                  @click.stop
                />
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="aSlicedRows.length === 0" class="empty-state">
            <div class="i-lucide-database empty-icon" />
            <p class="empty-title">No entries</p>
            <p class="empty-sub">Click <strong>Add</strong> to create your first entry</p>
          </div>

          <!-- Rows -->
          <TransitionGroup name="row">
            <div
              v-for="oRow in aSlicedRows"
              :key="oRow.id ?? oRow"
              :class="['grid-row', { active: oSelectedItem && oSelectedItem.id === oRow.id }]"
              :style="gridStyle"
              role="row"
              @click="fnItemClick(oRow)"
              @dblclick="fnDblItemClick()"
              @contextmenu.prevent="fnContextMenu($event, oRow)"
            >
              <div v-for="(oSF, sK) in oStruct" :key="sK" class="grid-cell" role="gridcell">
                <!-- URL -->
                <template v-if="oRow[sK] && sK === 'url'">
                  <div class="cell-url">
                    <div class="i-lucide-external-link cell-icon" />
                    <a :href="oRow[sK]" target="_blank" rel="noopener" class="url-link">{{ oRow[sK] }}</a>
                  </div>
                </template>
                <!-- Password -->
                <template v-else-if="sK === 'password' && oRow[sK]">
                  <div class="cell-secret">
                    <div class="i-lucide-lock cell-icon" />
                    <span v-if="!revealedRows.has(oRow.id)" class="masked">••••••••</span>
                    <span v-else class="revealed">{{ oRow[sK] }}</span>
                    <button class="cell-action-btn" @click.stop="fnToggleMask(oRow.id)" :aria-label="revealedRows.has(oRow.id) ? 'Hide password' : 'Show password'">
                      <div :class="revealedRows.has(oRow.id) ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
                    </button>
                    <button class="cell-action-btn" @click.stop="fnCopyWithFeedback(oRow[sK], 'password', oRow.id)" aria-label="Copy password">
                      <div :class="copiedCells.has('password-' + oRow.id) ? 'i-lucide-check' : 'i-lucide-copy'" :style="copiedCells.has('password-' + oRow.id) ? 'color:var(--c-success)' : ''" />
                    </button>
                  </div>
                </template>
                <!-- Login -->
                <template v-else-if="sK === 'login' && oRow[sK]">
                  <div class="cell-secret">
                    <div class="i-lucide-user cell-icon" />
                    <span class="cell-text">{{ oRow[sK] }}</span>
                    <button class="cell-action-btn" @click.stop="fnCopyWithFeedback(oRow[sK], 'login', oRow.id)" aria-label="Copy login">
                      <div :class="copiedCells.has('login-' + oRow.id) ? 'i-lucide-check' : 'i-lucide-copy'" :style="copiedCells.has('login-' + oRow.id) ? 'color:var(--c-success)' : ''" />
                    </button>
                  </div>
                </template>
                <!-- Default -->
                <template v-else>
                  <span class="cell-text">{{ oRow[sK] }}</span>
                </template>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </div>

      <!-- Bottom pagination for mobile -->
      <div class="pagination-bar pagination-bottom" v-if="iMaxPages > 1">
        <button class="pg-btn" @click="fnPrev" :disabled="iPage <= 1"><div class="i-lucide-chevron-left" /></button>
        <span class="pg-info">{{ iPage }} / {{ iMaxPages }}</span>
        <button class="pg-btn" @click="fnNext" :disabled="iPage >= iMaxPages"><div class="i-lucide-chevron-right" /></button>
      </div>
    </main>

    <!-- ===== Context Menu ===== -->
    <Teleport to="body">
      <Transition name="ctx">
        <div
          v-if="ctxMenu.show"
          class="context-menu"
          :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
          @click="ctxMenu.show = false"
        >
          <button class="ctx-item" @click="fnCopyWithFeedback(ctxMenu.row?.login, 'login', ctxMenu.row?.id)">
            <div class="i-lucide-user" /> Copy Login
          </button>
          <button class="ctx-item" @click="fnCopyWithFeedback(ctxMenu.row?.password, 'password', ctxMenu.row?.id)">
            <div class="i-lucide-lock" /> Copy Password
          </button>
          <div class="ctx-sep" />
          <button class="ctx-item" @click="fnEditCtx">
            <div class="i-lucide-pencil" /> Edit
          </button>
          <button class="ctx-item" v-if="ctxMenu.row?.url" @click="fnOpenUrl(ctxMenu.row.url)">
            <div class="i-lucide-external-link" /> Open URL
          </button>
          <div class="ctx-sep" />
          <button class="ctx-item ctx-item--danger" @click="fnDeleteCtx">
            <div class="i-lucide-trash-2" /> Delete
          </button>
        </div>
      </Transition>
    </Teleport>

    <!-- ===== Keyboard Shortcuts Modal ===== -->
    <BaseModal v-model="bShowShortcuts" title="Keyboard Shortcuts" size="sm" :closable="true">
      <div class="shortcuts-list">
        <div class="shortcut-item" v-for="s in shortcuts" :key="s.key">
          <kbd class="shortcut-kbd">{{ s.key }}</kbd>
          <span class="shortcut-desc">{{ s.desc }}</span>
        </div>
      </div>
    </BaseModal>

    <!-- ===== Mobile bottom nav ===== -->
    <nav class="bottom-nav">
      <button class="bottom-nav-btn" @click="db.bShowRepoWindow = true" aria-label="Repository">
        <div class="i-lucide-database" />
      </button>
      <button class="bottom-nav-btn" @click="fnAddClick" aria-label="Add">
        <div class="i-lucide-plus" />
      </button>
      <button class="bottom-nav-btn" @click="fnSaveAll" aria-label="Save">
        <div class="i-lucide-save" />
        <span v-if="db.iUnsavedChanges" class="sidebar-badge" />
      </button>
      <button class="bottom-nav-btn" @click="fnToggleTheme" :aria-label="themeLabel">
        <div :class="bDarkTheme ? 'i-lucide-sun' : 'i-lucide-moon'" />
      </button>
    </nav>
  </div>

  <EditWindow title="Edit Entry" :form_name="sTableName" :table_name="sTableName" />
  <RepoWindow />
  <NotificationToast ref="notifRef" />
  <LoaderOverlay />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useTemplateRef, provide, reactive } from 'vue'
import { useDatabaseStore } from './stores/database'
import { useReposStore } from './stores/repos'
import { fnDebounce } from './lib'

import EditWindow from './components/edit_window.vue'
import RepoWindow from './components/repo_window.vue'
import NotificationToast from './components/NotificationToast.vue'
import LoaderOverlay from './components/loader.vue'
import BaseModal from './components/BaseModal.vue'

const db = useDatabaseStore()
const repos = useReposStore()

const file_selector = useTemplateRef('file_selector')
const notifRef = ref<InstanceType<typeof NotificationToast> | null>(null)
const tableScrollRef = ref<HTMLElement | null>(null)

// Provide notification globally
provide('notify', (title: string, message?: string, type?: 'success' | 'error' | 'info') => {
  notifRef.value?.show(title, message, type)
})

// --- local state ---
const menuTop = [
  { id: 'repo-window', title: 'Select Repository', icon: 'i-lucide-database' },
  { id: 'save', title: 'Save', icon: 'i-lucide-save' },
  { id: 'add', title: 'Add', icon: 'i-lucide-plus' },
  { id: 'edit', title: 'Edit', icon: 'i-lucide-pencil' },
  { id: 'remove', title: 'Delete', icon: 'i-lucide-trash-2' },
]

const menuData = [
  { id: 'export', title: 'Export', icon: 'i-lucide-download' },
]

const oSelectedItem = ref(null)
const sTableName = 'table'
const revealedRows = reactive(new Set<string>())
const copiedCells = reactive(new Set<string>())
const bDarkTheme = ref(localStorage.getItem('bDarkTheme') === 'true')
const bSaveAnim = ref(false)
const bShowShortcuts = ref(false)
let iAutoLockTimer: ReturnType<typeof setTimeout> | null = null
const iAutoLockTimeout = 5 * 60 * 1000

// Sorting
const sortKey = ref<string | null>(null)
const sortAsc = ref(true)

// Context menu
const ctxMenu = reactive({ show: false, x: 0, y: 0, row: null as any })

const themeLabel = computed(() => bDarkTheme.value ? 'Light theme' : 'Dark theme')

// Keyboard shortcuts info
const shortcuts = [
  { key: 'Ctrl + S', desc: 'Save all changes' },
  { key: 'Ctrl + N', desc: 'Add new entry' },
  { key: 'Ctrl + F', desc: 'Focus first filter' },
  { key: 'Delete', desc: 'Delete selected entry' },
  { key: 'Enter', desc: 'Edit selected entry' },
  { key: 'Escape', desc: 'Deselect / Close modal' },
]

// --- computed ---
const oStruct = computed(() => db.oStructure.table)
const oTable = computed(() => db.oDatabase.table)
const iStructLength = computed(() => Object.keys(oStruct.value).length)

const gridStyle = computed(() => {
  const cols: string[] = []
  const keys = Object.keys(oStruct.value)
  for (const k of keys) {
    if (k === 'category') cols.push('120px')
    else if (k === 'name') cols.push('minmax(120px, 1.5fr)')
    else if (k === 'login') cols.push('minmax(100px, 1fr)')
    else if (k === 'password') cols.push('160px')
    else if (k === 'url') cols.push('minmax(100px, 1.2fr)')
    else cols.push('minmax(80px, 1fr)')
  }
  return { display: 'grid', gridTemplateColumns: cols.join(' ') }
})

const iPageCount = computed(() => {
  const h = tableScrollRef.value?.clientHeight ?? (window.innerHeight - 100)
  return Math.max(1, Math.floor((h - 60) / 40))
})

const iPage = computed({
  get: () => db.oDatabase.table.page ?? 1,
  set: (sV) => { db.oDatabase.table.page = sV * 1 },
})

const aRows = computed(() => {
  let result = oTable.value.data.filter((oI: Record<string, string>) => {
    let bResult = true
    for (const sK in oTable.value.filter) {
      if (oTable.value.filter[sK]) {
        bResult = bResult && ~oI[sK].indexOf(oTable.value.filter[sK])
      }
    }
    return bResult
  })

  // Sorting
  if (sortKey.value) {
    const key = sortKey.value
    const asc = sortAsc.value
    result = [...result].sort((a: any, b: any) => {
      const va = (a[key] ?? '').toString().toLowerCase()
      const vb = (b[key] ?? '').toString().toLowerCase()
      if (va < vb) return asc ? -1 : 1
      if (va > vb) return asc ? 1 : -1
      return 0
    })
  }

  return result
})

const iMaxPages = computed(() => Math.max(1, Math.ceil(aRows.value.length / iPageCount.value)))

const aSlicedRows = computed(() =>
  aRows.value.slice((iPage.value - 1) * iPageCount.value, iPage.value * iPageCount.value)
)

// --- methods ---
function fnFirst() { iPage.value = 1 }
function fnPrev() { if (iPage.value > 1) iPage.value -= 1 }
function fnLast() { iPage.value = iMaxPages.value }
function fnNext() { if (iPage.value < iMaxPages.value) iPage.value += 1 }

function fnCopyWithFeedback(sText: string, field: string, rowId: string) {
  if (!sText) return
  navigator.clipboard.writeText(sText)
  const key = `${field}-${rowId}`
  copiedCells.add(key)
  setTimeout(() => copiedCells.delete(key), 1500)
  notifRef.value?.show('Copied', '', 'success', 1500)
}

function fnSort(key: string) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function fnContextMenu(e: MouseEvent, oRow: any) {
  oSelectedItem.value = oRow
  ctxMenu.show = true
  ctxMenu.x = e.clientX
  ctxMenu.y = e.clientY
  ctxMenu.row = oRow
}

function fnEditCtx() {
  if (ctxMenu.row) {
    db.fnShowEditWindow({ sFormName: sTableName, oItem: ctxMenu.row })
  }
}

function fnDeleteCtx() {
  if (ctxMenu.row) {
    if (confirm('Are you sure you want to delete this entry?')) {
      db.fnRemoveFromTable({ sTableName, oItem: ctxMenu.row })
      if (oSelectedItem.value?.id === ctxMenu.row.id) oSelectedItem.value = null
    }
  }
}

function fnOpenUrl(url: string) {
  window.open(url, '_blank', 'noopener')
}

const fnFilterInput = fnDebounce((oE: Event, sK: string) => {
  db.fnUpdateFilter({ sTableName, sName: sK, sV: (oE.target as HTMLInputElement).value })
}, 300)

function fnClickLeftMenu(oItem: { id: string }) {
  if (oItem.id === 'repo-window') db.bShowRepoWindow = true
  if (oItem.id === 'save') fnSaveAll()
  if (oItem.id === 'add') fnAddClick()
  if (oItem.id === 'edit') fnEditClick()
  if (oItem.id === 'remove') fnRemoveClick()
  if (oItem.id === 'export') db.fnExportDatabase()
}

function fnItemClick(oRow: any) { oSelectedItem.value = oRow }

function fnDblItemClick() {
  if (oSelectedItem.value) {
    db.fnShowEditWindow({ sFormName: sTableName, oItem: oSelectedItem.value })
  }
}

function fnAddClick() {
  db.fnShowEditWindow({ sFormName: sTableName, oItem: {} })
}

function fnEditClick() {
  if (oSelectedItem.value) {
    db.fnShowEditWindow({ sFormName: sTableName, oItem: oSelectedItem.value })
  } else {
    alert('Please select an entry')
  }
}

function fnRemoveClick() {
  if (oSelectedItem.value) {
    if (confirm('Are you sure you want to delete this entry?')) {
      db.fnRemoveFromTable({ sTableName, oItem: oSelectedItem.value })
      oSelectedItem.value = null
    }
  } else {
    alert('Please select an entry')
  }
}

function fnSaveAll() {
  db.fnSaveToAllDatabase()
  bSaveAnim.value = true
  setTimeout(() => { bSaveAnim.value = false }, 2000)
  notifRef.value?.show('Saved', 'Data has been saved', 'success')
}

function fnTriggerImport() {
  file_selector.value?.click()
}

function fnImport() {
  const el = file_selector.value as HTMLInputElement
  const oFile = el.files?.[0]
  if (!oFile) return
  const reader = new FileReader()
  reader.readAsText(oFile)
  reader.onload = () => db.fnImportDatabase(reader.result as string)
}

function fnFileImportChange() { fnImport() }

function fnToggleMask(rowId: string) {
  if (revealedRows.has(rowId)) {
    revealedRows.delete(rowId)
  } else {
    revealedRows.add(rowId)
    setTimeout(() => revealedRows.delete(rowId), 3000)
  }
}

function fnToggleTheme() {
  bDarkTheme.value = !bDarkTheme.value
  localStorage.setItem('bDarkTheme', String(bDarkTheme.value))
  document.documentElement.setAttribute('data-theme', bDarkTheme.value ? 'dark' : 'light')
}

function fnResetAutoLock() {
  if (iAutoLockTimer) clearTimeout(iAutoLockTimer)
  iAutoLockTimer = setTimeout(() => {
    if (db.sPassword) {
      db.sPassword = ''
      db.bShowRepoWindow = true
    }
  }, iAutoLockTimeout)
}

function fnCloseCtxOnClick() { ctxMenu.show = false }

// --- lifecycle ---
onMounted(() => {
  repos.fnLoadRepos()

  if (bDarkTheme.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      fnSaveAll()
    }
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault()
      fnAddClick()
    }
    if (e.ctrlKey && e.key === 'f') {
      e.preventDefault()
      const firstFilter = document.querySelector('.filter-input') as HTMLInputElement | null
      firstFilter?.focus()
    }
    if (e.key === 'Delete' && !e.ctrlKey && !e.altKey) {
      // Only if no input is focused
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        fnRemoveClick()
      }
    }
    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey) {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        fnEditClick()
      }
    }
    if (e.key === 'Escape') {
      oSelectedItem.value = null
      ctxMenu.show = false
    }
  })

  document.addEventListener('click', fnCloseCtxOnClick)

  const fnActivity = () => fnResetAutoLock()
  document.addEventListener('mousemove', fnActivity)
  document.addEventListener('keydown', fnActivity)
  document.addEventListener('click', fnActivity)
  fnResetAutoLock()
})

onUnmounted(() => {
  document.removeEventListener('click', fnCloseCtxOnClick)
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

/* ===== Sidebar ===== */
.sidebar {
  width: 56px;
  height: 100%;
  background: var(--c-bg-elevated);
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  padding: var(--space-2);
  gap: var(--space-1);
  flex-shrink: 0;
}

.sidebar-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.sidebar-group + .sidebar-group {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--c-border);
}

.sidebar-spacer { flex: 1; }

.sidebar-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 20px;
}
.sidebar-btn:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}
.sidebar-btn:active {
  transform: scale(0.95);
}

.sidebar-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--c-danger);
  border-radius: var(--radius-full);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.8); }
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
.pagination-bottom {
  border-top: 1px solid var(--c-border);
  border-bottom: none;
  display: none;
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

/* ===== Bottom Navigation (Mobile) ===== */
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--c-bg-elevated);
  border-top: 1px solid var(--c-border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: var(--z-header);
}

.bottom-nav-btn {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 22px;
  cursor: pointer;
  transition: color var(--transition-fast);
}
.bottom-nav-btn:active {
  color: var(--c-accent);
}

/* ===== Context Menu ===== */
.context-menu {
  position: fixed;
  z-index: 500;
  min-width: 180px;
  background: var(--c-bg-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: var(--space-1) 0;
  overflow: hidden;
}

.ctx-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  background: transparent;
  color: var(--c-text);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.ctx-item:hover {
  background: var(--c-bg-hover);
}
.ctx-item--danger {
  color: var(--c-danger);
}
.ctx-item--danger:hover {
  background: rgba(239, 68, 68, 0.1);
}

.ctx-sep {
  height: 1px;
  background: var(--c-border);
  margin: var(--space-1) 0;
}

.ctx-enter-active,
.ctx-leave-active {
  transition: all 150ms ease;
}
.ctx-enter-from,
.ctx-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* ===== Keyboard Shortcuts Modal ===== */
.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.shortcut-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--c-border);
}
.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-kbd {
  display: inline-flex;
  padding: var(--space-1) var(--space-2);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--c-text);
  box-shadow: 0 1px 0 var(--c-border);
  min-width: 80px;
  justify-content: center;
}

.shortcut-desc {
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
  .bottom-nav {
    display: flex;
  }
  .app-shell {
    padding-bottom: 56px;
  }
  .pagination-bar:first-child {
    display: none;
  }
  .pagination-bottom {
    display: flex;
  }
  .cell-action-btn {
    opacity: 1;
  }
}
</style>
