import { ref } from 'vue'
import { useDatabaseStore, parseDatabase, SaveError, PasswordMismatchError } from '@/stores/database'
import { useReposStore } from '@/stores/repos'
import { useEntrySelection } from '@/composables/useEntrySelection'
import type { NotifyFn } from '@/composables/useNotify'
import type { ConfirmFn } from '@/composables/useConfirm'
import { describeMerge, type MergeStats } from '@/utils/merge'

/**
 * Saving to the repositories (with merging) and replacing the database from a file.
 * `afterMerge` runs when saving merged changes from another device into the open database.
 */
export function useSaveActions(notify: NotifyFn, confirm: ConfirmFn, afterMerge: () => void) {
  const db = useDatabaseStore()
  const repos = useReposStore()
  const { clearSelection } = useEntrySelection()

  // Briefly true after a successful save (the sidebar shows a check mark)
  const justSaved = ref(false)

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
    const confirmed = await confirm({
      title: 'Database changed elsewhere',
      message: `The database in "${repos.currentRepo?.name}" was changed on another device and saved with a different master password, so the changes can't be merged.\n\n` +
        'Overwrite it with the database open here (the other version is kept as a local backup), or cancel and reconnect with the other master password to see it.',
      confirmText: 'Overwrite',
      danger: true,
    })
    if (confirmed) await saveAll({ overwrite: true })
  }

  /** Replace the open database with an exported file of this app (asks first) */
  async function importDatabase(file: File) {
    try {
      const json = await file.text()
      // Validate before asking, so an invalid file never prompts to overwrite
      const imported = parseDatabase(json)
      const currentCount = db.table.data.length
      const importedCount = imported.table.data.length
      if (currentCount > 0 && !await confirm({
        title: 'Replace database',
        message: `Replace the current ${currentCount} entries with ${importedCount} entries from "${file.name}"?\n\n` +
          'The change is not saved to repositories until you press Save.',
        confirmText: 'Replace',
        danger: true,
      })) return

      db.importDatabase(json)
      clearSelection()
      notify('Imported', `${importedCount} entries loaded — press Save to store them`, 'success')
    } catch (error) {
      notify('Import failed', error instanceof Error ? error.message : String(error), 'error', 8000)
    }
  }

  return { justSaved, saveAll, importDatabase }
}
