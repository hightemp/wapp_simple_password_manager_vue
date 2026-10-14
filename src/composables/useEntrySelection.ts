import { ref, watch } from 'vue'
import { useDatabaseStore, type Entry } from '@/stores/database'
import { sharedComposable } from '@/composables/sharedComposable'
import { useEntryList } from '@/composables/useEntryList'

interface SelectEvent {
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
}

function createEntrySelection() {
  const db = useDatabaseStore()
  const { filteredRows, isTrashView } = useEntryList()

  // The focused entry: edited with Enter, moved with the arrow keys
  const selectedEntry = ref<Entry | null>(null)
  // Multi-selection: Ctrl/⌘+click toggles, Shift+click selects a range
  const selectedIds = ref(new Set<number>())
  let anchorId: number | null = null

  // Any single selection (keyboard, context menu, …) replaces the multi-selection
  watch(selectedEntry, (entry) => {
    if (!entry) selectedIds.value = new Set()
    else if (!selectedIds.value.has(entry.id!)) selectedIds.value = new Set([entry.id!])
  })

  // Drop selected rows that left the list (moved to or out of the trash, deleted, …)
  watch([() => db.table.data, () => db.trash, isTrashView], () => {
    const listed = new Set(filteredRows.value.map((entry) => entry.id))
    if ([...selectedIds.value].every((id) => listed.has(id))) return
    selectedIds.value = new Set([...selectedIds.value].filter((id) => listed.has(id)))
    if (selectedEntry.value && !listed.has(selectedEntry.value.id)) selectedEntry.value = null
  })

  function selectSingle(row: Entry) {
    selectedIds.value = new Set([row.id!])
    selectedEntry.value = row
    anchorId = row.id!
  }

  function selectRow(row: Entry, event?: SelectEvent) {
    if (event && (event.ctrlKey || event.metaKey)) {
      const ids = new Set(selectedIds.value)
      if (ids.has(row.id!)) {
        ids.delete(row.id!)
        selectedIds.value = ids
        if (selectedEntry.value?.id === row.id) {
          const nextId = [...ids].pop()
          selectedEntry.value = filteredRows.value.find((entry) => entry.id === nextId) ?? null
        }
      } else {
        ids.add(row.id!)
        selectedIds.value = ids
        selectedEntry.value = row
      }
      anchorId = row.id!
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
  }

  /** Keyboard navigation works on a single row */
  function collapseSelection() {
    const entry = selectedEntry.value
    selectedIds.value = new Set(entry ? [entry.id!] : [])
  }

  function clearSelection() {
    selectedEntry.value = null
  }

  /** Merging replaced the entry objects: point the selection at the new ones */
  function refreshSelection() {
    const id = selectedEntry.value?.id
    selectedEntry.value = db.table.data.find((entry) => entry.id === id) ?? null
  }

  return { selectedEntry, selectedIds, selectSingle, selectRow, collapseSelection, clearSelection, refreshSelection }
}

/** Selected rows of the entry list, shared by the table and the app's actions */
export const useEntrySelection = sharedComposable(createEntrySelection)
