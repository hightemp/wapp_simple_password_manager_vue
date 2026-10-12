import { useDatabaseStore } from '@/stores/database'
import { useNotify, type NotifyFn } from './useNotify'

// The Undo button stays this long
const UNDO_DURATION = 6000

/** Move entries to the trash with an "Undo" toast */
export function useTrashActions(notify: NotifyFn = useNotify()) {
  const db = useDatabaseStore()

  function moveToTrash(ids: number[], name?: string) {
    if (!ids.length) return
    db.removeEntries(ids)
    const title = ids.length === 1 ? 'Moved to trash' : `${ids.length} entries moved to trash`
    notify(title, ids.length === 1 && name ? `"${name}"` : undefined, 'success', UNDO_DURATION, {
      label: 'Undo',
      run: () => db.restoreFromTrash(ids),
    })
  }

  return { moveToTrash }
}
