import { ref, reactive } from 'vue'
import { useDatabaseStore, type Entry } from '@/stores/database'
import { useEntryList } from '@/composables/useEntryList'
import { useEntrySelection } from '@/composables/useEntrySelection'
import { useTrashActions } from '@/composables/useTrashActions'
import type { NotifyFn } from '@/composables/useNotify'
import type { ConfirmFn } from '@/composables/useConfirm'
import { copySecret, CLIPBOARD_CLEAR_DELAY } from '@/utils/clipboard'
import { entryType, describeField } from '@/types/entryTypes'

/** QR code shown by a type action (Wi-Fi) */
export interface QrCode {
  title: string
  text: string
  hint?: string
}

/**
 * Actions on entries: copying fields, type actions, editing and deleting the selection, the trash.
 * `notify` and `confirm` are passed in because App.vue provides them (inject doesn't work there).
 */
export function useEntryActions(notify: NotifyFn, confirm: ConfirmFn) {
  const db = useDatabaseStore()
  const { isTrashView } = useEntryList()
  const { selectedEntry, selectedIds } = useEntrySelection()
  const { moveToTrash } = useTrashActions(notify)

  // Keys like "password-12" of copy buttons that were just used, to show a check mark
  const copiedCells = reactive(new Set<string>())
  const qrCode = ref<QrCode | null>(null)

  async function copyField(entry: Entry | null, field: string) {
    const raw = entry?.[field] ?? ''
    // Card numbers are stored with spaces for reading; copy the digits
    const text = describeField(entry ?? {}, field).kind === 'card_number' ? raw.replace(/\D/g, '') : raw
    if (!entry || !text) return
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
  async function deleteEntry(entry: Entry | null): Promise<boolean> {
    if (!entry) return false
    if (isTrashView.value) return deleteForever([entry.id!], entry.name)
    moveToTrash([entry.id!], entry.name)
    return true
  }

  async function deleteForever(ids: number[], name?: string): Promise<boolean> {
    const confirmed = await confirm({
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

  function restoreEntries(ids: number[]) {
    db.restoreFromTrash(ids)
    notify(ids.length === 1 ? 'Entry restored' : `${ids.length} entries restored`, undefined, 'success', 2000)
  }

  async function emptyTrash() {
    const count = db.trash.length
    const confirmed = await confirm({
      title: 'Empty trash',
      message: `Delete ${count} ${count === 1 ? 'entry' : 'entries'} in the trash for good? This cannot be undone.`,
      confirmText: 'Empty trash',
      danger: true,
    })
    if (confirmed) db.emptyTrash()
  }

  return {
    copiedCells, qrCode, copyField, runAction, editSelected, deleteEntry, deleteSelected, restoreEntries, emptyTrash,
  }
}
