import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDatabaseStore, parseDatabase } from '../../stores/database'
import { useReposStore } from '../../stores/repos'
import { NotFoundError } from '../../services/FileSystemDriver'
import { DecryptionError } from '../../utils/crypto'

describe('Database Store (Pinia)', () => {
  let db

  beforeEach(() => {
    setActivePinia(createPinia())
    db = useDatabaseStore()
  })

  describe('CRUD operations', () => {
    it('should add new item via edit window', () => {
      db.openEditWindow({})
      expect(db.editWindow.isOpen).toBe(true)

      db.setFormField('name', 'Gmail')
      db.setFormField('login', 'user@gmail.com')
      db.setFormField('password', 'secret123')
      db.setFormField('category', 'email')

      db.saveEditWindow()

      expect(db.database.table.data.length).toBe(1)
      expect(db.database.table.data[0].name).toBe('Gmail')
      expect(db.database.table.data[0].login).toBe('user@gmail.com')
      expect(db.database.table.data[0].id).toBe(1)
      expect(db.unsavedChanges).toBe(1)
    })

    it('should edit existing item', () => {
      db.openEditWindow({})
      db.setFormField('name', 'Old Name')
      db.saveEditWindow()

      const item = db.database.table.data[0]

      db.openEditWindow(item)
      db.setFormField('name', 'New Name')
      db.saveEditWindow()

      expect(db.database.table.data.length).toBe(1)
      expect(db.database.table.data[0].name).toBe('New Name')
    })

    it('should remove item', () => {
      db.openEditWindow({})
      db.setFormField('name', 'Item 1')
      db.saveEditWindow()

      db.openEditWindow({})
      db.setFormField('name', 'Item 2')
      db.saveEditWindow()

      expect(db.database.table.data.length).toBe(2)

      db.removeEntry(db.database.table.data[0])

      expect(db.database.table.data.length).toBe(1)
      expect(db.database.table.data[0].name).toBe('Item 2')
    })

    it('should increment unsaved changes counter', () => {
      expect(db.unsavedChanges).toBe(0)

      db.openEditWindow({})
      db.saveEditWindow()
      expect(db.unsavedChanges).toBe(1)

      db.openEditWindow({})
      db.saveEditWindow()
      expect(db.unsavedChanges).toBe(2)
    })
  })

  describe('filter', () => {
    it('should update filter', () => {
      db.setFilter('name', 'test')
      expect(db.database.table.filter.name).toBe('test')
    })
  })

  describe('UI state', () => {
    it('should toggle loader', () => {
      db.isLoading = true
      expect(db.isLoading).toBe(true)
      db.isLoading = false
      expect(db.isLoading).toBe(false)
    })

    it('should toggle repo window', () => {
      db.isRepoWindowOpen = false
      expect(db.isRepoWindowOpen).toBe(false)
      db.isRepoWindowOpen = true
      expect(db.isRepoWindowOpen).toBe(true)
    })

    it('should toggle edit window', () => {
      db.openEditWindow({})
      expect(db.editWindow.isOpen).toBe(true)
      db.closeEditWindow()
      expect(db.editWindow.isOpen).toBe(false)
    })
  })

  describe('form state', () => {
    it('should populate form when editing', () => {
      const item = { name: 'Test', login: 'user', password: 'pass', category: 'web' }
      db.openEditWindow(item)

      expect(db.form.name).toBe('Test')
      expect(db.form.login).toBe('user')
      expect(db.form.password).toBe('pass')
      expect(db.form.category).toBe('web')
    })

    it('should clear form when adding new item', () => {
      db.setFormField('name', 'old')
      db.openEditWindow({})

      expect(db.form.name).toBe('')
      expect(db.form.login).toBe('')
    })
  })

  describe('database update', () => {
    it('should replace entire database', () => {
      const newDatabase = {
        table: {
          last_index: 5,
          page: 1,
          data: [{ id: 1 }, { id: 2 }],
          filter: { name: '' },
        },
      }

      db.setDatabase(newDatabase)
      expect(db.database).toEqual(newDatabase)
      expect(db.database.table.data.length).toBe(2)
    })
  })

  describe('getters', () => {
    it('should get field value', () => {
      db.setFormField('name', 'hello')
      expect(db.form.name).toBe('hello')
    })
  })

  describe('saving', () => {
    function addEntry(name) {
      db.openEditWindow({})
      db.setFormField('name', name)
      db.saveEditWindow()
    }

    it('should reset unsaved changes after a successful save', async () => {
      const repos = useReposStore()
      repos.selectRepo(0)
      db.masterPassword = 'secret'
      addEntry('Item')

      await db.saveToAllRepos()
      expect(db.unsavedChanges).toBe(0)
    })

    it('should reject and keep unsaved changes when a repo fails', async () => {
      const repos = useReposStore()
      repos.selectRepo(0)
      repos.fileSystems[0] = {
        writeEncryptedJson: () => Promise.reject(new Error('boom')),
        readFile: () => Promise.reject(new Error('still boom')),
      }
      db.masterPassword = 'secret'
      addEntry('Item')

      await expect(db.saveToAllRepos()).rejects.toThrow(/Local Storage/)
      expect(db.unsavedChanges).toBe(1)
    })
  })

  describe('lock', () => {
    it('should wipe decrypted data and the master password', async () => {
      db.masterPassword = 'secret'
      db.setDatabase({ table: { last_index: 1, page: 1, data: [{ id: 1, name: 'x' }], selection_id: null, filter: {} } })
      db.setFormField('password', 'p@ss')
      db.isRepoWindowOpen = false

      await db.lock()

      expect(db.masterPassword).toBe('')
      expect(db.database.table.data).toEqual([])
      expect(db.form.password).toBe('')
      expect(db.isRepoWindowOpen).toBe(true)
    })

    it('should save unsaved changes before locking', async () => {
      const repos = useReposStore()
      repos.selectRepo(0)
      const writes = []
      repos.fileSystems[0] = {
        writeEncryptedJson: (path, value) => { writes.push(JSON.parse(JSON.stringify(value))); return Promise.resolve() },
        readFile: () => Promise.resolve({ data: '', sha: '' }),
      }
      db.masterPassword = 'secret'
      db.openEditWindow({})
      db.setFormField('name', 'Unsaved')
      db.saveEditWindow()

      await db.lock()

      expect(writes.length).toBe(1)
      expect(writes[0].table.data[0].name).toBe('Unsaved')
      expect(db.database.table.data).toEqual([])
    })

    it('should still lock when saving fails', async () => {
      const repos = useReposStore()
      repos.selectRepo(0)
      repos.fileSystems[0] = {
        writeEncryptedJson: () => Promise.reject(new Error('offline')),
        readFile: () => Promise.reject(new Error('offline')),
      }
      db.masterPassword = 'secret'
      db.openEditWindow({})
      db.saveEditWindow()

      await expect(db.lock()).rejects.toThrow(/offline/)
      expect(db.masterPassword).toBe('')
      expect(db.database.table.data).toEqual([])
    })
  })

  describe('import', () => {
    const valid = {
      table: {
        last_index: 2,
        page: 3,
        data: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
        selection_id: 5,
        filter: { name: 'x' },
      },
    }

    it('should import a valid database and mark it unsaved', () => {
      db.importDatabase(JSON.stringify(valid))
      expect(db.database.table.data.map((e) => e.name)).toEqual(['A', 'B'])
      expect(db.database.table.page).toBe(1)
      expect(db.unsavedChanges).toBe(1)
    })

    it('should keep the current database when the file is invalid', () => {
      db.importDatabase(JSON.stringify(valid))
      expect(() => db.importDatabase('{"foo": 1}')).toThrow(/missing "table"/)
      expect(db.database.table.data.length).toBe(2)
    })

    it.each([
      ['not json', /not valid JSON/],
      ['[]', /missing "table"/],
      ['{"table": {"data": {}}}', /must be a list/],
      ['{"table": {"data": [1]}}', /Entry #1 is not an object/],
    ])('should reject %s', (json, message) => {
      expect(() => parseDatabase(json)).toThrow(message)
    })

    it('should assign ids to entries without one and fix last_index', () => {
      const result = parseDatabase(JSON.stringify({
        table: { last_index: 1, data: [{ id: 7, name: 'A' }, { name: 'B' }, { id: 7, name: 'dup' }] },
      }))
      expect(result.table.data.map((e) => e.id)).toEqual([7, 8, 9])
      expect(result.table.last_index).toBe(9)
    })

    it('should fill defaults for missing fields', () => {
      const result = parseDatabase('{"table": {"data": []}}')
      expect(result.table.last_index).toBe(0)
      expect(result.table.page).toBe(1)
      expect(result.table.filter.name).toBe('')
    })
  })

  describe('loadDatabase', () => {
    function connectWith(fileSystem) {
      const repos = useReposStore()
      repos.selectRepo(0)
      repos.fileSystems[0] = fileSystem
      db.masterPassword = 'secret'
      db.isRepoWindowOpen = false
    }

    it('should load and normalize the stored database', async () => {
      connectWith({ readEncryptedJson: async () => ({ table: { data: [{ name: 'A' }] } }) })
      await db.loadDatabase()
      expect(db.table.data).toEqual([{ name: 'A', id: 1 }])
      expect(db.isLoading).toBe(false)
      expect(db.connectionError).toBe('')
    })

    it('should create the database when the repo has none', async () => {
      const writes = []
      connectWith({
        readEncryptedJson: async () => { throw new NotFoundError('passwords-database') },
        writeEncryptedJson: async (path, value) => { writes.push(value) },
      })
      await db.loadDatabase()
      expect(writes.length).toBe(1)
      expect(db.connectionError).toBe('')
      expect(db.isLoading).toBe(false)
    })

    it('should report a wrong password', async () => {
      connectWith({ readEncryptedJson: async () => { throw new DecryptionError() } })
      await db.loadDatabase()
      expect(db.connectionError).toMatch(/Incorrect password/)
      expect(db.isRepoWindowOpen).toBe(true)
    })

    it('should not overwrite a file that decrypts to something that is not a database', async () => {
      const writes = []
      connectWith({
        readEncryptedJson: async () => null,
        writeEncryptedJson: async (path, value) => { writes.push(value) },
      })
      await db.loadDatabase()
      expect(writes.length).toBe(0)
      expect(db.connectionError).toMatch(/damaged/)
    })
  })
})
