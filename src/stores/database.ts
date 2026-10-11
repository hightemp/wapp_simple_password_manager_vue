import { defineStore } from 'pinia'
import { ref } from 'vue'
import { downloadJson } from '@/utils/download'
import type { FileSystemDriver } from '@/services/FileSystemDriver'
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

export type Database = Record<string, Table>

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const FIELD_NAMES = ['category', 'name', 'login', 'password', 'url', 'description']

function emptyFields(): Record<string, string> {
  return Object.fromEntries(FIELD_NAMES.map((name) => [name, '']))
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

function createEmptyForms(): Record<string, Record<string, any>> {
  return { table: emptyFields() }
}

function createClosedEditWindows(): Record<string, { isOpen: boolean; item: Entry }> {
  return { table: { isOpen: false, item: {} } }
}

export const useDatabaseStore = defineStore('database', () => {
  // --- state ---
  const masterPassword = ref('')

  // Column definitions per table
  const structure = ref<Record<string, Record<string, Column>>>({
    table: {
      category: { label: 'Category', type: 'text' },
      name: { label: 'Name', type: 'text' },
      login: { label: 'Login', type: 'text' },
      password: { label: 'Password', type: 'text' },
      url: { label: 'URL', type: 'text' },
      description: { label: 'Description', type: 'textarea' },
    },
  })

  // Persisted (encrypted) database — field names are part of the file format
  const database = ref<Database>(createEmptyDatabase())

  // Values of the edit form fields per form
  const forms = ref<Record<string, Record<string, any>>>(createEmptyForms())

  const editWindows = ref<Record<string, { isOpen: boolean; item: Entry }>>(createClosedEditWindows())

  const unsavedChanges = ref(0)

  // UI state that database actions need to access
  const isLoading = ref(false)
  const isRepoWindowOpen = ref(true)
  const connectionError = ref('')

  // --- getters ---
  function getFormField(formName: string, fieldName: string) {
    return forms.value[formName][fieldName]
  }

  // --- actions ---
  function setFormField(formName: string, fieldName: string, value: unknown) {
    forms.value[formName][fieldName] = value
  }

  function setFilter(tableName: string, fieldName: string, value: string) {
    database.value[tableName].filter[fieldName] = value
  }

  function setDatabase(newDatabase: Database) {
    database.value = newDatabase
  }

  function openEditWindow(formName: string, item: Entry) {
    editWindows.value[formName].isOpen = true
    editWindows.value[formName].item = item
    for (const fieldName in forms.value[formName]) {
      forms.value[formName][fieldName] = fieldName in item ? item[fieldName] : ''
    }
  }

  function closeEditWindow(formName: string) {
    editWindows.value[formName].isOpen = false
  }

  /** Copy form values into the edited item; new items get an id and are appended to the table */
  function saveEditWindow(tableName: string, formName: string) {
    const item = editWindows.value[formName].item
    for (const fieldName in forms.value[formName]) {
      item[fieldName] = forms.value[formName][fieldName]
    }
    if (!item.id) {
      item.id = ++database.value[tableName].last_index
      database.value[tableName].data.push(item)
    }
    unsavedChanges.value++
  }

  function removeEntry(tableName: string, entry: Entry) {
    database.value[tableName].data = database.value[tableName].data.filter(
      (other) => other.id != entry.id
    )
    unsavedChanges.value++
  }

  function exportDatabase() {
    downloadJson('passwords-database', JSON.stringify(database.value, null, 4))
  }

  function importDatabase(json: string) {
    setDatabase(JSON.parse(json))
  }

  function connectToCurrentRepo() {
    const repos = useReposStore()
    repos.createFileSystem(repos.selectedIndex!)
    repos.markCurrentRepoForSave()
    loadDatabase()
  }

  /**
   * Save the database to every repo marked `needsSave`.
   * Rejects with an error listing the failed repos; unsaved changes are kept in that case.
   */
  async function saveToAllRepos(): Promise<void> {
    const repos = useReposStore()
    const targets = repos.allRepos
      .map((repo, index) => ({ repo, index }))
      .filter(({ repo }) => repo.needsSave)

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

  function loadDatabase() {
    const fileSystem = useReposStore().currentFileSystem!
    connectionError.value = ''
    isLoading.value = true
    fileSystem
      .readEncryptedJson(DATABASE_PATH, masterPassword.value)
      .then((data) => {
        if (!data) throw 'Cannot destructure property'
        setDatabase(data as Database)
        isLoading.value = false
      })
      .catch((error: unknown) => {
        const message = error + ''
        // Wrong password — decryption produces invalid data
        if (
          message.match(/Malformed UTF-8 data/) ||
          message.match(/SyntaxError/) ||
          message.match(/Unexpected token/) ||
          message.match(/JSON\.parse/)
        ) {
          showConnectionError('Incorrect password. Please check your master password and try again.')
          return
        }
        // No database yet — create new one
        if (
          message.match(/Cannot destructure property/) ||
          message.match(/Not Found/)
        ) {
          fileSystem
            .writeEncryptedJson(DATABASE_PATH, database.value, masterPassword.value)
            .then(() => {
              fileSystem
                .readEncryptedJson(DATABASE_PATH, masterPassword.value)
                .then((data) => {
                  setDatabase(data as Database)
                  isLoading.value = false
                })
                .catch(() => showConnectionError('Failed to read the newly created database.'))
            })
            .catch(() => showConnectionError('Failed to create new database.'))
          return
        }
        showConnectionError('Connection failed: ' + message)
      })
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
    forms.value = createEmptyForms()
    editWindows.value = createClosedEditWindows()
    unsavedChanges.value = 0
    isRepoWindowOpen.value = true

    if (saveError) throw saveError
  }

  return {
    masterPassword,
    structure,
    database,
    forms,
    editWindows,
    unsavedChanges,
    isLoading,
    isRepoWindowOpen,
    connectionError,
    getFormField,
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
