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
        <MobileSearchBar @pick-category="categoryPicker = { mode: 'filter' }" />
        <TrashBar v-if="isTrashView" compact @empty="emptyTrash" />
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
          <TrashBar v-if="isTrashView" @empty="emptyTrash" />
          <EntryTable
            :copied-cells="copiedCells"
            @copy="copyField"
            @edit="editSelected"
            @contextmenu="openContextMenu"
          />
        </div>
      </div>
    </main>

    <EntryContextMenu
      :entry="contextMenu.entry"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :in-trash="isTrashView"
      @copy="(field) => copyField(contextMenu.entry, field)"
      @edit="db.openEditWindow(contextMenu.entry!)"
      @history="historyEntry = contextMenu.entry"
      @action="(id) => runAction(contextMenu.entry, id)"
      @restore="restoreEntries([contextMenu.entry!.id!])"
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
    <!-- Before the details sheet so an entry opened from it shows on top -->
    <SecurityReportModal v-model="showSecurityReport" @open="openFromReport" />
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

  <input type="file" ref="importInput" class="sr-only" @change="onImportFile" />

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
import { ref, watch, onMounted, onUnmounted, useTemplateRef, provide, reactive } from 'vue'
import { useDatabaseStore, type Entry } from '@/stores/database'
import { useReposStore } from '@/stores/repos'
import { NOTIFY_KEY, type NotifyFn } from '@/composables/useNotify'
import { CONFIRM_KEY, type ConfirmFn } from '@/composables/useConfirm'
import { useCategoryState, type CategorySelection } from '@/composables/useCategoryState'
import { useEntryList } from '@/composables/useEntryList'
import { useEntrySelection } from '@/composables/useEntrySelection'
import { useEntryActions } from '@/composables/useEntryActions'
import { useSaveActions } from '@/composables/useSaveActions'
import { useHotkeys } from '@/composables/useHotkeys'
import { useAutoLock } from '@/composables/useAutoLock'
import { useTheme } from '@/composables/useTheme'
import { useSiteIcons } from '@/composables/useSiteIcons'
import type { MenuAction } from '@/types/menu'
import { describeField, expiryStatus, DEFAULT_TYPE, EXPIRING_FILTER, EXPIRY_WARNING_DAYS } from '@/types/entryTypes'

import AppSidebar from '@/components/AppSidebar.vue'
import BottomNav from '@/components/BottomNav.vue'
import MobileMenuSheet from '@/components/MobileMenuSheet.vue'
import MobileSearchBar from '@/components/MobileSearchBar.vue'
import TrashBar from '@/components/TrashBar.vue'
import EntryTable from '@/components/EntryTable.vue'
import EntryCardList from '@/components/EntryCardList.vue'
import EntryDetailsSheet from '@/components/EntryDetailsSheet.vue'
import CategoryPanel from '@/components/CategoryPanel.vue'
import CategoryPickerSheet from '@/components/CategoryPickerSheet.vue'
import EntryEditModal from '@/components/EntryEditModal.vue'
import EntryTypePicker from '@/components/EntryTypePicker.vue'
import ImportWizardModal from '@/components/ImportWizardModal.vue'
import EntryHistoryModal from '@/components/EntryHistoryModal.vue'
import QrCodeModal from '@/components/QrCodeModal.vue'
import EntryContextMenu from '@/components/EntryContextMenu.vue'
import SecurityReportModal from '@/components/SecurityReportModal.vue'
import RepoSettingsModal from '@/components/RepoSettingsModal.vue'
import CreateDatabaseModal from '@/components/CreateDatabaseModal.vue'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal.vue'
import NotificationToast from '@/components/NotificationToast.vue'
import LoaderOverlay from '@/components/LoaderOverlay.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const db = useDatabaseStore()
const repos = useReposStore()

const importInput = useTemplateRef<HTMLInputElement>('importInput')

const notifications = useTemplateRef('notifications')
const notify: NotifyFn = (title, message, type, duration, action) => {
  notifications.value?.show(title, message, type, duration, action)
}
provide(NOTIFY_KEY, notify)

const confirmDialog = useTemplateRef('confirmDialog')
const confirmAction: ConfirmFn = (options) => confirmDialog.value?.ask(options) ?? Promise.resolve(false)
provide(CONFIRM_KEY, confirmAction)

const { isMobile, searchQuery, isTrashView, activeCategory, filteredRows } = useEntryList()
const { selectedEntry, selectedIds, selectSingle, clearSelection, refreshSelection } = useEntrySelection()
const { selectOnly, selectTrash, typeFilter } = useCategoryState()
const {
  copiedCells, qrCode, copyField, runAction, editSelected, deleteEntry, deleteSelected, restoreEntries, emptyTrash,
} = useEntryActions(notify, confirmAction)
const { justSaved, saveAll, importDatabase } = useSaveActions(notify, confirmAction, afterMerge)
const { isDarkTheme, toggleTheme } = useTheme()
const { siteIconsEnabled, toggleSiteIcons } = useSiteIcons()

// --- local state ---
const showShortcuts = ref(false)
const showChangePassword = ref(false)
const showMobileMenu = ref(false)
const showTypePicker = ref(false)
const showImportWizard = ref(false)
const showSecurityReport = ref(false)
// Entry shown in the mobile details sheet
const detailsEntry = ref<Entry | null>(null)
// Entry whose history is shown
const historyEntry = ref<Entry | null>(null)
// Mobile category sheet: filter the list, or move one entry
const categoryPicker = ref<{ mode: 'filter' } | { mode: 'move'; entry: Entry } | null>(null)
// Context menu (shown while `entry` is set)
const contextMenu = reactive({ entry: null as Entry | null, x: 0, y: 0 })

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

function openContextMenu(event: MouseEvent, row: Entry) {
  if (!selectedIds.value.has(row.id!)) selectSingle(row)
  contextMenu.entry = row
  contextMenu.x = event.clientX
  contextMenu.y = event.clientY
}

function closeContextMenu() {
  contextMenu.entry = null
}

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

function editFromDetails() {
  const entry = detailsEntry.value
  detailsEntry.value = null
  if (entry) db.openEditWindow(entry)
}

function restoreFromDetails() {
  const entry = detailsEntry.value
  detailsEntry.value = null
  if (entry) restoreEntries([entry.id!])
}

async function deleteFromDetails() {
  if (await deleteEntry(detailsEntry.value)) detailsEntry.value = null
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

// --- import ---
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

async function onImportFile() {
  const input = importInput.value
  const file = input?.files?.[0]
  if (!input || !file) return
  await importDatabase(file)
  // Allow picking the same file again
  input.value = ''
}

/** Merging replaced the entry objects: drop references to the old ones */
function afterMerge() {
  refreshSelection()
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

function openSecurityReport() {
  if (!db.masterPassword) {
    notify('Not connected', 'Connect to a repository first', 'error')
    return
  }
  showSecurityReport.value = true
}

/** Open an entry from the security report to fix it (the report stays open underneath) */
function openFromReport(entry: Entry) {
  if (isMobile.value) detailsEntry.value = entry
  else db.openEditWindow(entry)
}

function onToggleSiteIcons() {
  toggleSiteIcons()
  notify(
    siteIconsEnabled.value ? 'Website icons on' : 'Website icons off',
    siteIconsEnabled.value ? 'Icons are loaded from DuckDuckGo, which sees the website addresses (not your logins or passwords)' : undefined,
    'info',
    siteIconsEnabled.value ? 6000 : 2000,
  )
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
    case 'toggle-site-icons': onToggleSiteIcons(); break
    case 'security-report': openSecurityReport(); break
    case 'more': showMobileMenu.value = true; break
    case 'lock': lockApp(); break
  }
}

async function lockApp() {
  if (!db.masterPassword) return
  clearSelection()
  closeContextMenu()
  showChangePassword.value = false
  showMobileMenu.value = false
  detailsEntry.value = null
  historyEntry.value = null
  qrCode.value = null
  showTypePicker.value = false
  showImportWizard.value = false
  showSecurityReport.value = false
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

useHotkeys({
  save: () => saveAll(),
  newEntry: () => newEntry(),
  edit: editSelected,
  remove: deleteSelected,
  escape: () => {
    selectedEntry.value = null
    closeContextMenu()
  },
})
useAutoLock(lockApp)

onMounted(() => {
  repos.loadRepos()
  document.addEventListener('click', closeContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
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
