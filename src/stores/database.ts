import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { downloadJson } from '@/utils/download'
import { DecryptionError } from '@/utils/crypto'
import { NotFoundError, type FileSystemDriver } from '@/services/FileSystemDriver'
import { useReposStore } from './repos'

export const DATABASE_PATH = 'passwords-database'

export interface Entry {
  id?: number
  [field: string]: any
}

export interface Column {
  label: string
  type: string
}

export interface Table {
  last_index: number
  page: number
  data: Entry[]
  selection_id: number | null
  filter: Record<string, string>
}

/** Shape of the (encrypted) database file — field names are part of the file format */
export interface Database {
  table: Table
}

// Table columns in display order
export const COLUMNS: Record<string, Column> = {
  category: { label: 'Category', type: 'text' },
  name: { label: 'Name', type: 'text' },
  login: { label: 'Login', type: 'text' },
  password: { label: 'Password', type: 'text' },
  url: { label: 'URL', type: 'text' },
  description: { label: 'Description', type: 'textarea' },
}

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
export function normalizeDatabase(parsed: any): Database {
  const table = parsed?.table
  if (!table || typeof table !== 'object' || Array.isArray(table)) {
    throw new Error('The file is not a password database (missing "table")')
  }
  if (!Array.isArray(table.data)) {
    throw new Error('The file is not a password database ("table.data" must be a list)')
  }

  const entries: Entry[] = table.data.map((entry: unknown, index: number) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Entry #${index + 1} is not an object`)
    }
    const result: Entry = {}
    for (const [key, value] of Object.entries(entry)) {
      result[key] = key === 'id' ? value : value == null ? '' : String(value)
    }
    return result
  })

  // Assign ids to entries without one, keeping existing ids unique
  const usedIds = new Set<number>()
  let lastIndex = Number.isInteger(table.last_index) ? table.last_index : 0
  for (const entry of entries) {
    if (Number.isInteger(entry.id) && !usedIds.has(entry.id!)) {
      usedIds.add(entry.id!)
      lastIndex = Math.max(lastIndex, entry.id!)
    } else {
      delete entry.id
    }
  }
  for (const entry of entries) {
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
      filter,
    },
  }
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

  /** Copy form values into the edited item; new items get an id and are appended to the table */
  function saveEditWindow() {
    const item = editWindow.value.item
    Object.assign(item, form.value)
    if (!item.id) {
      item.id = ++table.value.last_index
      table.value.data.push(item)
    }
    unsavedChanges.value++
  }

  function removeEntry(entry: Entry) {
    table.value.data = table.value.data.filter((other) => other.id != entry.id)
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
    exportDatabase,
    importDatabase,
    connectToCurrentRepo,
    saveToAllRepos,
    saveDatabase,
    loadDatabase,
    lock,
  }
})
