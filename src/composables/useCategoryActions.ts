import { useDatabaseStore } from '@/stores/database'
import { useCategoryState } from '@/composables/useCategoryState'
import { useNotify, type NotifyFn } from '@/composables/useNotify'
import { useConfirm, type ConfirmFn } from '@/composables/useConfirm'
import { parentPath, isWithin } from '@/utils/categories'

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Create, rename, move and delete categories, keeping the category selection and the
 * expanded nodes pointing at them. Shared by the desktop panel and the mobile sheet.
 */
export function useCategoryActions(notify: NotifyFn = useNotify(), confirm: ConfirmFn = useConfirm()) {
  const db = useDatabaseStore()
  const { selectedSet, reveal, followRename, followDelete } = useCategoryState()

  /** Returns the new path, or null when it could not be created */
  function createCategory(path: string): string | null {
    try {
      const created = db.createCategory(path)
      reveal(created)
      return created
    } catch (error) {
      notify('Cannot create category', errorText(error), 'error')
      return null
    }
  }

  function renameCategory(path: string, name: string) {
    try {
      followRename(path, db.renameCategory(path, name))
    } catch (error) {
      notify('Cannot rename category', errorText(error), 'error')
    }
  }

  /** Selected category paths (without All / Uncategorized) */
  function selectedPaths(): string[] {
    return [...selectedSet.value].filter((p): p is string => !!p)
  }

  /** Delete a category after asking; the delete button of a multi-selected one deletes the whole selection */
  async function deleteCategory(path: string): Promise<boolean> {
    const selection = selectedPaths()
    const paths = selection.includes(path) && selection.length > 1 ? selection : [path]
    const entryCount = db.table.data.filter((entry) => paths.some((p) => isWithin(entry.category ?? '', p))).length

    const what = paths.length === 1 ? `"${paths[0]}"` : `${paths.length} categories`
    const confirmed = await confirm({
      title: paths.length === 1 ? 'Delete category' : 'Delete categories',
      message: `Delete ${what}?\n\n` +
        (entryCount > 0
          ? `Their ${entryCount} entries and subcategories move one level up. No entries are deleted.`
          : 'No entries are deleted.'),
      confirmText: 'Delete',
      danger: true,
    })
    if (!confirmed) return false
    // Deepest first, mirroring the store, so the panel state follows each step
    const deepestFirst = [...paths].sort((a, b) => b.split('/').length - a.split('/').length)
    db.deleteCategories(deepestFirst)
    for (const deleted of deepestFirst) followDelete(deleted, parentPath(deleted))
    return true
  }

  /** Move categories under `newParent` ('' = top level) */
  function moveCategories(paths: string[], newParent: string) {
    try {
      for (const [from, to] of db.moveCategories(paths, newParent)) followRename(from, to)
    } catch (error) {
      notify('Cannot move category', errorText(error), 'error')
    }
  }

  function moveEntries(ids: number[], category: string) {
    db.moveEntries(ids, category)
    notify(
      ids.length === 1 ? 'Entry moved' : `${ids.length} entries moved`,
      category ? `to "${category}"` : 'to Uncategorized',
      'success',
      2000,
    )
  }

  return { createCategory, renameCategory, deleteCategory, moveCategories, moveEntries }
}
