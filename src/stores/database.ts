import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { downloadJson } from '@/utils/download'
import { DecryptionError } from '@/utils/crypto'
import { NotFoundError, type FileSystemDriver } from '@/services/FileSystemDriver'
import {
  normalizePath, parentPath, pathName, joinPath, isWithin, replacePrefix, collectPaths, buildTree,
} from '@/utils/categories'
import { useReposStore } from './repos'

export const DATABASE_PATH = 'passwords-database'

export interface Entry {
  id?: number
  // Previous values of changed fields, oldest first
  history?: HistoryVersion[]
  [field: string]: any
}

/** Values the fields had before one edit (only the fields that changed) */
export interface HistoryVersion {
  at: number
  fields: Record<string, string>
}

export interface TrashItem {
  entry: Entry
  deleted_at: number
}

export interface Column {
  label: string
  type: string
  // Shown as a table column (category is shown as the tree instead)
  inTable: boolean
}

export interface Table {
  last_index: number
  page: number
  data: Entry[]
  selection_id: number | null
  filter: Record<string, string>
  // Explicitly created category paths, so empty categories survive saving
  categories: string[]
  // Deleted entries, kept for TRASH_RETENTION
  trash: TrashItem[]
}

/** Shape of the (encrypted) database file — field names are part of the file format */
export interface Database {
  table: Table
}

// Table columns in display order
export const COLUMNS: Record<string, Column> = {
  category: { label: 'Category', type: 'category', inTable: false },
  name: { label: 'Name', type: 'text', inTable: true },
  login: { label: 'Login', type: 'text', inTable: true },
  password: { label: 'Password', type: 'password', inTable: true },
  url: { label: 'URL', type: 'text', inTable: true },
  description: { label: 'Description', type: 'textarea', inTable: true },
}

// Versions kept per entry
export const HISTORY_LIMIT = 20
// Entries in the trash are deleted for good after this time
export const TRASH_RETENTION = 30 * 24 * 60 * 60 * 1000
// Fields whose changes are recorded (moving to another category is not)
const HISTORY_FIELDS = Object.keys(COLUMNS).filter((name) => name !== 'category')

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function emptyFields(): Record<string, string> {
  return Object.fromEntries(Object.keys(COLUMNS).map((name) => [name, '']))
}

function createEmptyDatabase(): Database {
  return {
    table: {
      last_index: 0,
      page: 1,
      data: [],
      selection_id: null,
      filter: emptyFields(),
      categories: [],
      trash: [],
    },
  }
}

/**
 * Parse and validate an exported database (plain JSON).
 * Throws an Error with a user-readable message when the file is not a database.
 */
export function parseDatabase(json: string): Database {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (error) {
    throw new Error('The file is not valid JSON', { cause: error })
  }
  return normalizeDatabase(parsed)
}

/**
 * Validate a decoded database and fill in defaults.
 * Entries without an id (or with a duplicate one) get a new id.
 */
export function normalizeDatabase(parsed: any, now = Date.now()): Database {
  const table = parsed?.table
  if (!table || typeof table !== 'object' || Array.isArray(table)) {
    throw new Error('The file is not a password database (missing "table")')
  }
  if (!Array.isArray(table.data)) {
    throw new Error('The file is not a password database ("table.data" must be a list)')
  }

  const entries: Entry[] = table.data.map((entry: unknown, index: number) => normalizeEntry(entry, `Entry #${index + 1}`))

  // Damaged trash items are dropped rather than failing the whole database;
  // expired ones are deleted for good
  const trash: TrashItem[] = (Array.isArray(table.trash) ? table.trash : [])
    .filter((item: any) => item?.entry && typeof item.entry === 'object' && !Array.isArray(item.entry)
      && Number.isFinite(item.deleted_at) && now - item.deleted_at < TRASH_RETENTION)
    .map((item: any) => ({ entry: normalizeEntry(item.entry, 'Deleted entry'), deleted_at: item.deleted_at }))

  // Assign ids to entries without one, keeping existing ids unique (trash included,
  // so a restored entry never clashes)
  const allEntries = [...entries, ...trash.map((item) => item.entry)]
  const usedIds = new Set<number>()
  let lastIndex = Number.isInteger(table.last_index) ? table.last_index : 0
  for (const entry of allEntries) {
    if (Number.isInteger(entry.id) && !usedIds.has(entry.id!)) {
      usedIds.add(entry.id!)
      lastIndex = Math.max(lastIndex, entry.id!)
    } else {
      delete entry.id
    }
  }
  for (const entry of allEntries) {
    if (entry.id === undefined) entry.id = ++lastIndex
  }

  const filter = emptyFields()
  if (table.filter && typeof table.filter === 'object') {
    for (const [key, value] of Object.entries(table.filter)) {
      if (typeof value === 'string') filter[key] = value
    }
  }

  return {
    table: {
      last_index: lastIndex,
      page: 1,
      data: entries,
      selection_id: null,
      categories: Array.isArray(table.categories)
        ? collectPaths(table.categories.filter((path: unknown) => typeof path === 'string'), [])
        : [],
      filter,
      trash,
    },
  }
}

function normalizeEntry(entry: unknown, name: string): Entry {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error(`${name} is not an object`)
  }
  const result: Entry = {}
  for (const [key, value] of Object.entries(entry)) {
    if (key === 'id') result.id = value
    else if (key === 'history') result.history = normalizeHistory(value)
    else result[key] = value == null ? '' : String(value)
  }
  if ('category' in result) result.category = normalizePath(result.category)
  if (!result.history?.length) delete result.history
  return result
}

/** Keep well-formed versions only; values are strings */
function normalizeHistory(value: unknown): HistoryVersion[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((version) => version && Number.isFinite(version.at) && version.fields && typeof version.fields === 'object')
    .map((version) => ({
      at: version.at,
      fields: Object.fromEntries(Object.entries(version.fields)
        .map(([key, field]) => [key, field == null ? '' : String(field)])),
    }))
    .filter((version) => Object.keys(version.fields).length > 0)
    .slice(-HISTORY_LIMIT)
}

/**
 * Set field values of an entry, recording the previous values of the changed ones
 * as a history version. Returns whether anything changed.
 */
export function changeEntry(entry: Entry, values: Record<string, string>, now = Date.now()): boolean {
  const previous: Record<string, string> = {}
  let changed = false
  for (const [field, value] of Object.entries(values)) {
    const old = entry[field] ?? ''
    if (old === value) continue
    if (HISTORY_FIELDS.includes(field)) previous[field] = old
    entry[field] = value
    changed = true
  }
  if (Object.keys(previous).length) {
    entry.history = [...(entry.history ?? []), { at: now, fields: previous }].slice(-HISTORY_LIMIT)
  }
  return changed
}

/** Drop paths that are inside another path of the list */
function topLevelPaths(paths: string[]): string[] {
  const unique = [...new Set(paths)].filter(Boolean)
  return unique.filter((path) => !unique.some((other) => other !== path && isWithin(path, other)))
}

function createClosedEditWindow(): { isOpen: boolean; item: Entry } {
  return { isOpen: false, item: {} }
}

export const useDatabaseStore = defineStore('database', () => {
  // --- state ---
  const masterPassword = ref('')

  // Decrypted database
  const database = ref<Database>(createEmptyDatabase())

  // Values of the entry edit form
  const form = ref<Record<string, string>>(emptyFields())

  // Entry being edited ({} while adding a new one)
  const editWindow = ref(createClosedEditWindow())

  const unsavedChanges = ref(0)

  // UI state that database actions need to access
  const isLoading = ref(false)
  const isRepoWindowOpen = ref(true)
  const connectionError = ref('')

  // --- getters ---
  const table = computed(() => database.value.table)

  // All category paths: explicitly created ones plus those used by entries (with ancestors)
  const categoryPaths = computed(() =>
    collectPaths(table.value.categories ?? [], table.value.data.map((entry) => entry.category ?? ''))
  )
  const categoryTree = computed(() =>
    buildTree(table.value.categories ?? [], table.value.data.map((entry) => entry.category ?? ''))
  )
  const uncategorizedCount = computed(() => table.value.data.filter((entry) => !entry.category).length)
  const trash = computed(() => table.value.trash ?? [])

  // --- actions ---
  function setFormField(fieldName: string, value: string) {
    form.value[fieldName] = value
  }

  function setFilter(fieldName: string, value: string) {
    table.value.filter[fieldName] = value
  }

  function setDatabase(newDatabase: Database) {
    database.value = newDatabase
  }

  function openEditWindow(item: Entry) {
    editWindow.value = { isOpen: true, item }
    for (const fieldName in form.value) {
      form.value[fieldName] = fieldName in item ? item[fieldName] : ''
    }
  }

  function closeEditWindow() {
    editWindow.value.isOpen = false
  }

  /**
   * Copy form values into the edited item; new items get an id and are appended to the table.
   * Changes of an existing item are recorded in its history.
   */
  function saveEditWindow() {
    const item = editWindow.value.item
    const values = { ...form.value, category: normalizePath(form.value.category) }
    if (!item.id) {
      Object.assign(item, values)
      item.id = ++table.value.last_index
      table.value.data.push(item)
    } else if (!changeEntry(item, values)) {
      return
    }
    unsavedChanges.value++
  }

  function findEntry(id: number): Entry {
    const entry = table.value.data.find((item) => item.id === id)
    if (!entry) throw new Error('Entry not found')
    return entry
  }

  // --- history ---

  /** Set fields of an entry to older values (recorded in the history as a change too) */
  function restoreFields(id: number, fields: Record<string, string>) {
    if (changeEntry(findEntry(id), fields)) unsavedChanges.value++
  }

  function clearHistory(id: number) {
    const entry = findEntry(id)
    if (!entry.history) return
    delete entry.history
    unsavedChanges.value++
  }

  // --- trash ---

  function removeEntry(entry: Entry) {
    removeEntries([entry.id!])
  }

  /** Move entries to the trash */
  function removeEntries(ids: number[], now = Date.now()) {
    const remove = new Set(ids)
    const removed = table.value.data.filter((entry) => remove.has(entry.id!))
    if (!removed.length) return
    table.value.data = table.value.data.filter((entry) => !remove.has(entry.id!))
    table.value.trash = [...trash.value, ...removed.map((entry) => ({ entry, deleted_at: now }))]
    unsavedChanges.value++
  }

  /** Move entries back from the trash, into the category they were in */
  function restoreFromTrash(ids: number[]) {
    const restore = new Set(ids)
    const restored = trash.value.filter((item) => restore.has(item.entry.id!))
    if (!restored.length) return
    table.value.trash = trash.value.filter((item) => !restore.has(item.entry.id!))
    table.value.data.push(...restored.map((item) => item.entry))
    unsavedChanges.value++
  }

  function deleteForever(ids: number[]) {
    const remove = new Set(ids)
    const kept = trash.value.filter((item) => !remove.has(item.entry.id!))
    if (kept.length === trash.value.length) return
    table.value.trash = kept
    unsavedChanges.value++
  }

  function emptyTrash() {
    if (!trash.value.length) return
    table.value.trash = []
    unsavedChanges.value++
  }

  // --- categories ---

  /** Apply a path rewrite to every entry and to the explicit category list */
  function rewriteCategories(rewrite: (path: string) => string) {
    for (const entry of table.value.data) {
      const path = normalizePath(entry.category)
      const next = rewrite(path)
      if (next !== path || entry.category !== path) entry.category = next
    }
    table.value.categories = collectPaths((table.value.categories ?? []).map(rewrite), [])
    unsavedChanges.value++
  }

  /** Create a category (and its missing parents); returns the normalized path */
  function createCategory(path: string): string {
    const normalized = normalizePath(path)
    if (!normalized) throw new Error('Category name is required')
    table.value.categories = collectPaths([...(table.value.categories ?? []), normalized], [])
    unsavedChanges.value++
    return normalized
  }

  /** Rename the last segment of a category; subcategories and entries follow. Returns the new path */
  function renameCategory(path: string, newName: string): string {
    const name = normalizePath(newName)
    if (!name) throw new Error('Category name is required')
    if (name.includes('/')) throw new Error('Category name cannot contain "/"')
    const target = joinPath(parentPath(path), name)
    if (target !== path) rewriteCategories((p) => replacePrefix(p, path, target))
    return target
  }

  /** Delete a category: its entries and subcategories move up to the parent category */
  function deleteCategory(path: string) {
    const parent = parentPath(path)
    rewriteCategories((p) => replacePrefix(p, path, parent))
  }

  /** Move a category under another one ('' = root). Returns the new path */
  function moveCategory(path: string, newParent: string): string {
    if (isWithin(newParent, path)) throw new Error('A category cannot be moved into itself')
    const target = joinPath(newParent, pathName(path))
    if (target !== path) rewriteCategories((p) => replacePrefix(p, path, target))
    return target
  }

  /**
   * Move several categories under `newParent` ('' = root). Subcategories of another moved
   * category travel with it. Returns [old path, new path] pairs of the moved top-level ones.
   */
  function moveCategories(paths: string[], newParent: string): [string, string][] {
    const roots = topLevelPaths(paths)
    if (roots.some((path) => isWithin(newParent, path))) {
      throw new Error('A category cannot be moved into itself')
    }
    return roots.map((path) => [path, moveCategory(path, newParent)])
  }

  /** Delete several categories (deepest first, so contents move up step by step) */
  function deleteCategories(paths: string[]) {
    const deepestFirst = [...new Set(paths)].sort((a, b) => b.split('/').length - a.split('/').length)
    for (const path of deepestFirst) deleteCategory(path)
  }

  /** Set the category of several entries ('' = uncategorized) */
  function moveEntries(ids: number[], category: string) {
    const path = normalizePath(category)
    const move = new Set(ids)
    for (const entry of table.value.data) {
      if (move.has(entry.id!)) entry.category = path
    }
    unsavedChanges.value++
  }

  function exportDatabase() {
    downloadJson('passwords-database', JSON.stringify(database.value, null, 4))
  }

  /** Replace the database with an exported file; throws if the file is invalid */
  function importDatabase(json: string) {
    setDatabase(parseDatabase(json))
    unsavedChanges.value++
  }

  function connectToCurrentRepo() {
    const repos = useReposStore()
    repos.createFileSystem(repos.selectedIndex!)
    repos.markCurrentRepoForSave()
    loadDatabase()
  }

  /**
   * Save the database to every repo in `repos.reposToSave`.
   * Rejects with an error listing the failed repos; unsaved changes are kept in that case.
   */
  async function saveToAllRepos(): Promise<void> {
    const repos = useReposStore()
    const targets = repos.allRepos
      .map((repo, index) => ({ repo, index }))
      .filter(({ index }) => repos.reposToSave.has(index))

    const results = await Promise.allSettled(targets.map(({ index }) => {
      if (!repos.fileSystems[index]) {
        repos.createFileSystem(index)
      }
      return saveDatabase(repos.fileSystems[index])
    }))

    const failures = results
      .map((result, i) => ({ result, repo: targets[i].repo }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, repo }) => `${repo.name} (${errorMessage((result as PromiseRejectedResult).reason)})`)

    if (failures.length > 0) {
      throw new Error('Failed to save to: ' + failures.join(', '))
    }
    unsavedChanges.value = 0
  }

  async function saveDatabase(fileSystem: FileSystemDriver): Promise<void> {
    try {
      await fileSystem.writeEncryptedJson(DATABASE_PATH, database.value, masterPassword.value)
    } catch (_) {
      // Retry once after re-reading the file (refreshes cached SHA / file id)
      await fileSystem.readFile(DATABASE_PATH)
      await fileSystem.writeEncryptedJson(DATABASE_PATH, database.value, masterPassword.value)
    }
  }

  function showConnectionError(message: string) {
    isLoading.value = false
    connectionError.value = message
    isRepoWindowOpen.value = true
  }

  async function loadDatabase(): Promise<void> {
    const fileSystem = useReposStore().currentFileSystem!
    connectionError.value = ''
    isLoading.value = true

    let data: unknown
    try {
      data = await fileSystem.readEncryptedJson(DATABASE_PATH, masterPassword.value)
    } catch (error) {
      if (error instanceof DecryptionError) {
        showConnectionError('Incorrect password (or the database file is damaged). Please check your master password and try again.')
      } else if (error instanceof NotFoundError) {
        await createDatabase(fileSystem)
      } else {
        showConnectionError('Connection failed: ' + errorMessage(error))
      }
      return
    }

    try {
      setDatabase(normalizeDatabase(data))
      isLoading.value = false
    } catch (error) {
      showConnectionError('The database file is damaged: ' + errorMessage(error))
    }
  }

  /**
   * Repo has no database yet — write the one currently in memory: empty on a fresh
   * start, or the open database when switching to a new repo (copies it there).
   */
  async function createDatabase(fileSystem: FileSystemDriver): Promise<void> {
    try {
      await fileSystem.writeEncryptedJson(DATABASE_PATH, database.value, masterPassword.value)
    } catch (error) {
      showConnectionError('Failed to create new database: ' + errorMessage(error))
      return
    }
    isLoading.value = false
  }

  /**
   * Lock the app: forget the master password and wipe all decrypted data from memory.
   * Unsaved changes are saved first when possible; a failed save is reported to the caller
   * but the app is locked anyway.
   */
  async function lock(): Promise<void> {
    let saveError: unknown = null
    if (unsavedChanges.value > 0 && masterPassword.value) {
      try {
        await saveToAllRepos()
      } catch (error) {
        saveError = error
      }
    }

    masterPassword.value = ''
    database.value = createEmptyDatabase()
    form.value = emptyFields()
    editWindow.value = createClosedEditWindow()
    unsavedChanges.value = 0
    isRepoWindowOpen.value = true

    if (saveError) throw saveError
  }

  return {
    masterPassword,
    columns: COLUMNS,
    database,
    table,
    categoryPaths,
    categoryTree,
    uncategorizedCount,
    trash,
    form,
    editWindow,
    unsavedChanges,
    isLoading,
    isRepoWindowOpen,
    connectionError,
    setFormField,
    setFilter,
    setDatabase,
    openEditWindow,
    closeEditWindow,
    saveEditWindow,
    removeEntry,
    removeEntries,
    restoreFromTrash,
    deleteForever,
    emptyTrash,
    restoreFields,
    clearHistory,
    createCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    moveCategories,
    deleteCategories,
    moveEntries,
    exportDatabase,
    importDatabase,
    connectToCurrentRepo,
    saveToAllRepos,
    saveDatabase,
    loadDatabase,
    lock,
  }
})
