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
  const database = ref<Database>({
    table: {
      last_index: 0,
      page: 1,
      data: [],
      selection_id: null,
      filter: {
        category: '',
        name: '',
        login: '',
        password: '',
        url: '',
        description: '',
      },
    },
  })

  // Values of the edit form fields per form
  const forms = ref<Record<string, Record<string, any>>>({
    table: {
      category: '',
      name: '',
      login: '',
      password: '',
      url: '',
      description: '',
    },
  })

  const editWindows = ref<Record<string, { isOpen: boolean; item: Entry }>>({
    table: {
      isOpen: false,
      item: {},
    },
  })

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

  function saveToAllRepos() {
    const repos = useReposStore()
    const saves: Promise<void>[] = []
    repos.allRepos.forEach((repo, index) => {
      if (repo.needsSave) {
        if (!repos.fileSystems[index]) {
          repos.createFileSystem(index)
        }
        saves.push(saveDatabase(repos.fileSystems[index]))
      }
    })
    return Promise.all(saves)
  }

  function saveDatabase(fileSystem: FileSystemDriver) {
    return fileSystem
      .writeEncryptedJson(DATABASE_PATH, database.value, masterPassword.value)
      .then(() => {
        unsavedChanges.value = 0
      })
      .catch(() => {
        // Retry once after re-reading the file (refreshes cached SHA / file id)
        fileSystem.readFile(DATABASE_PATH).then(() => {
          return fileSystem
            .writeEncryptedJson(DATABASE_PATH, database.value, masterPassword.value)
            .then(() => {
              unsavedChanges.value = 0
            })
        })
      })
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
  }
})
