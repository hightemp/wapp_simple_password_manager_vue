import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDatabaseStore } from '../../stores/database'
import { useReposStore } from '../../stores/repos'

describe('Database Store (Pinia)', () => {
  let db

  beforeEach(() => {
    setActivePinia(createPinia())
    db = useDatabaseStore()
  })

  describe('CRUD operations', () => {
    it('should add new item via edit window', () => {
      db.openEditWindow('table', {})
      expect(db.editWindows.table.isOpen).toBe(true)

      db.setFormField('table', 'name', 'Gmail')
      db.setFormField('table', 'login', 'user@gmail.com')
      db.setFormField('table', 'password', 'secret123')
      db.setFormField('table', 'category', 'email')

      db.saveEditWindow('table', 'table')

      expect(db.database.table.data.length).toBe(1)
      expect(db.database.table.data[0].name).toBe('Gmail')
      expect(db.database.table.data[0].login).toBe('user@gmail.com')
      expect(db.database.table.data[0].id).toBe(1)
      expect(db.unsavedChanges).toBe(1)
    })

    it('should edit existing item', () => {
      db.openEditWindow('table', {})
      db.setFormField('table', 'name', 'Old Name')
      db.saveEditWindow('table', 'table')

      const item = db.database.table.data[0]

      db.openEditWindow('table', item)
      db.setFormField('table', 'name', 'New Name')
      db.saveEditWindow('table', 'table')

      expect(db.database.table.data.length).toBe(1)
      expect(db.database.table.data[0].name).toBe('New Name')
    })

    it('should remove item', () => {
      db.openEditWindow('table', {})
      db.setFormField('table', 'name', 'Item 1')
      db.saveEditWindow('table', 'table')

      db.openEditWindow('table', {})
      db.setFormField('table', 'name', 'Item 2')
      db.saveEditWindow('table', 'table')

      expect(db.database.table.data.length).toBe(2)

      db.removeEntry('table', db.database.table.data[0])

      expect(db.database.table.data.length).toBe(1)
      expect(db.database.table.data[0].name).toBe('Item 2')
    })

    it('should increment unsaved changes counter', () => {
      expect(db.unsavedChanges).toBe(0)

      db.openEditWindow('table', {})
      db.saveEditWindow('table', 'table')
      expect(db.unsavedChanges).toBe(1)

      db.openEditWindow('table', {})
      db.saveEditWindow('table', 'table')
      expect(db.unsavedChanges).toBe(2)
    })
  })

  describe('filter', () => {
    it('should update filter', () => {
      db.setFilter('table', 'name', 'test')
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
      db.openEditWindow('table', {})
      expect(db.editWindows.table.isOpen).toBe(true)
      db.closeEditWindow('table')
      expect(db.editWindows.table.isOpen).toBe(false)
    })
  })

  describe('form state', () => {
    it('should populate form when editing', () => {
      const item = { name: 'Test', login: 'user', password: 'pass', category: 'web' }
      db.openEditWindow('table', item)

      expect(db.forms.table.name).toBe('Test')
      expect(db.forms.table.login).toBe('user')
      expect(db.forms.table.password).toBe('pass')
      expect(db.forms.table.category).toBe('web')
    })

    it('should clear form when adding new item', () => {
      db.setFormField('table', 'name', 'old')
      db.openEditWindow('table', {})

      expect(db.forms.table.name).toBe('')
      expect(db.forms.table.login).toBe('')
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
      db.setFormField('table', 'name', 'hello')
      expect(db.getFormField('table', 'name')).toBe('hello')
    })
  })

  describe('saving', () => {
    function addEntry(name) {
      db.openEditWindow('table', {})
      db.setFormField('table', 'name', name)
      db.saveEditWindow('table', 'table')
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
      db.setFormField('table', 'password', 'p@ss')
      db.isRepoWindowOpen = false

      await db.lock()

      expect(db.masterPassword).toBe('')
      expect(db.database.table.data).toEqual([])
      expect(db.forms.table.password).toBe('')
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
      db.openEditWindow('table', {})
      db.setFormField('table', 'name', 'Unsaved')
      db.saveEditWindow('table', 'table')

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
      db.openEditWindow('table', {})
      db.saveEditWindow('table', 'table')

      await expect(db.lock()).rejects.toThrow(/offline/)
      expect(db.masterPassword).toBe('')
      expect(db.database.table.data).toEqual([])
    })
  })
})
