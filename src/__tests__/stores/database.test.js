import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDatabaseStore, parseDatabase, normalizeDatabase, changeEntry, HISTORY_LIMIT, TRASH_RETENTION } from '../../stores/database'
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

  describe('categories', () => {
    function seed(categories, explicit = []) {
      db.setDatabase({
        table: {
          last_index: categories.length, page: 1, selection_id: null, filter: {},
          categories: explicit,
          data: categories.map((category, i) => ({ id: i + 1, name: 'E' + (i + 1), category })),
        },
      })
    }
    const categoryOf = (id) => db.table.data.find((e) => e.id === id).category

    it('should derive paths and counts from entries and explicit categories', () => {
      seed(['Work/Email', 'Work', ''], ['Empty'])
      expect(db.categoryPaths).toEqual(['Empty', 'Work', 'Work/Email'])
      expect(db.categoryTree.find((n) => n.path === 'Work').count).toBe(2)
      expect(db.uncategorizedCount).toBe(1)
    })

    it('should create categories with their parents', () => {
      seed([])
      expect(db.createCategory(' A / B ')).toBe('A/B')
      expect(db.categoryPaths).toEqual(['A', 'A/B'])
      expect(db.unsavedChanges).toBe(1)
    })

    it('should rename a category with its subcategories and entries', () => {
      seed(['Work', 'Work/Email', 'Workshop'], ['Work/Empty'])
      expect(db.renameCategory('Work', 'Job')).toBe('Job')
      expect([1, 2, 3].map(categoryOf)).toEqual(['Job', 'Job/Email', 'Workshop'])
      expect(db.table.categories).toEqual(['Job', 'Job/Empty'])
      expect(() => db.renameCategory('Job', 'a/b')).toThrow()
    })

    it('should move contents to the parent when deleting a category', () => {
      seed(['Work/Email', 'Work/Email/Old', 'Work'])
      db.deleteCategory('Work/Email')
      expect([1, 2, 3].map(categoryOf)).toEqual(['Work', 'Work/Old', 'Work'])

      db.deleteCategory('Work')
      expect([1, 2, 3].map(categoryOf)).toEqual(['', 'Old', ''])
    })

    it('should move a category under another one but not into itself', () => {
      seed(['Email', 'Email/Old', 'Work'])
      expect(db.moveCategory('Email', 'Work')).toBe('Work/Email')
      expect([1, 2, 3].map(categoryOf)).toEqual(['Work/Email', 'Work/Email/Old', 'Work'])
      expect(() => db.moveCategory('Work', 'Work/Email')).toThrow(/into itself/)
      expect(db.moveCategory('Work/Email', '')).toBe('Email')
    })

    it('should move several categories, subcategories travel with their parent', () => {
      seed(['A', 'A/Sub', 'B', 'Target'])
      const moved = db.moveCategories(['A', 'A/Sub', 'B'], 'Target')
      expect(moved).toEqual([['A', 'Target/A'], ['B', 'Target/B']])
      expect([1, 2, 3, 4].map(categoryOf)).toEqual(['Target/A', 'Target/A/Sub', 'Target/B', 'Target'])
      expect(() => db.moveCategories(['Target/A', 'Target/B'], 'Target/B')).toThrow(/into itself/)
    })

    it('should delete several categories, deepest first', () => {
      seed(['Work', 'Work/Email', 'Work/Email/Old', 'Other'])
      db.deleteCategories(['Work', 'Work/Email', 'Other'])
      expect([1, 2, 3, 4].map(categoryOf)).toEqual(['', '', 'Old', ''])
    })

    it('should move and remove several entries', () => {
      seed(['A', 'B', 'C'])
      db.moveEntries([1, 3], ' X / Y ')
      expect([1, 2, 3].map(categoryOf)).toEqual(['X/Y', 'B', 'X/Y'])
      db.removeEntries([1, 2])
      expect(db.table.data.map((e) => e.id)).toEqual([3])
    })

    it('should normalize the category when saving an entry', () => {
      seed([])
      db.openEditWindow({})
      db.setFormField('name', 'N')
      db.setFormField('category', ' Work // Mail ')
      db.saveEditWindow()
      expect(db.table.data[0].category).toBe('Work/Mail')
    })

    it('should keep explicit categories when importing', () => {
      db.importDatabase(JSON.stringify({ table: { data: [{ category: 'A//B' }], categories: ['Empty', 5] } }))
      expect(db.table.categories).toEqual(['Empty'])
      expect(db.table.data[0].category).toBe('A/B')
    })
  })

  describe('history', () => {
    function seed() {
      db.setDatabase(normalizeDatabase({
        table: { data: [{ id: 1, category: 'Web', name: 'Site', login: 'old-login', password: 'old-pass', url: '', description: '' }] },
      }))
    }
    const entry = () => db.table.data[0]

    function edit(values) {
      db.openEditWindow(entry())
      for (const [field, value] of Object.entries(values)) db.setFormField(field, value)
      db.saveEditWindow()
    }

    it('should record previous values of changed fields only', () => {
      seed()
      edit({ password: 'new-pass', description: 'note' })
      expect(entry().password).toBe('new-pass')
      expect(entry().history).toHaveLength(1)
      expect(entry().history[0].fields).toEqual({ password: 'old-pass', description: '' })
      expect(db.unsavedChanges).toBe(1)
    })

    it('should not record a version when nothing changed', () => {
      seed()
      edit({})
      expect(entry().history).toBeUndefined()
      expect(db.unsavedChanges).toBe(0)
    })

    it('should not record category changes', () => {
      seed()
      edit({ category: 'Mail' })
      expect(entry().category).toBe('Mail')
      expect(entry().history).toBeUndefined()
      expect(db.unsavedChanges).toBe(1)
      db.moveEntries([1], 'Other')
      expect(entry().history).toBeUndefined()
    })

    it('should not record history for new entries', () => {
      seed()
      db.openEditWindow({})
      db.setFormField('name', 'New')
      db.saveEditWindow()
      expect(db.table.data[1].history).toBeUndefined()
    })

    it(`should keep the last ${HISTORY_LIMIT} versions`, () => {
      const item = { id: 1, password: 'p0' }
      for (let i = 1; i <= HISTORY_LIMIT + 5; i++) changeEntry(item, { password: 'p' + i }, i)
      expect(item.history).toHaveLength(HISTORY_LIMIT)
      expect(item.history[0].fields.password).toBe('p5')
      expect(item.history.at(-1)).toEqual({ at: HISTORY_LIMIT + 5, fields: { password: 'p' + (HISTORY_LIMIT + 4) } })
    })

    it('should restore fields and record the restore as a change', () => {
      seed()
      edit({ login: 'new-login', password: 'new-pass' })
      db.restoreFields(1, entry().history[0].fields)
      expect(entry().login).toBe('old-login')
      expect(entry().password).toBe('old-pass')
      expect(entry().history).toHaveLength(2)
      expect(entry().history[1].fields).toEqual({ login: 'new-login', password: 'new-pass' })
    })

    it('should clear the history', () => {
      seed()
      edit({ password: 'x' })
      db.clearHistory(1)
      expect(entry().history).toBeUndefined()
      expect(entry().password).toBe('x')
    })

    it('should keep valid versions when loading and drop damaged ones', () => {
      const database = normalizeDatabase({
        table: {
          data: [{
            id: 1, name: 'A',
            history: [
              { at: 5, fields: { password: 'p', login: null } },
              { at: 'x', fields: { password: 'bad' } },
              { at: 6 },
              { at: 7, fields: {} },
              null,
            ],
          }, { id: 2, history: 'oops' }],
        },
      })
      expect(database.table.data[0].history).toEqual([{ at: 5, fields: { password: 'p', login: '' } }])
      expect(database.table.data[1].history).toBeUndefined()
    })
  })

  describe('trash', () => {
    const DAY = 24 * 60 * 60 * 1000

    function seed() {
      db.setDatabase(normalizeDatabase({
        table: { data: [{ id: 1, name: 'A', category: 'Work' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }] },
      }))
    }
    const ids = () => db.table.data.map((e) => e.id)
    const trashIds = () => db.trash.map((item) => item.entry.id)

    it('should move removed entries to the trash with their history', () => {
      seed()
      changeEntry(db.table.data[0], { password: 'x' })
      db.removeEntries([1, 3], 1000)
      expect(ids()).toEqual([2])
      expect(trashIds()).toEqual([1, 3])
      expect(db.trash[0].deleted_at).toBe(1000)
      expect(db.trash[0].entry.history).toHaveLength(1)
      expect(db.unsavedChanges).toBe(1)
    })

    it('should restore entries into their category', () => {
      seed()
      db.removeEntries([1])
      db.restoreFromTrash([1])
      expect(ids()).toEqual([2, 3, 1])
      expect(db.table.data[2].category).toBe('Work')
      expect(db.trash).toEqual([])
      expect(db.categoryPaths).toContain('Work')
    })

    it('should delete entries forever and empty the trash', () => {
      seed()
      db.removeEntries([1, 2, 3])
      db.deleteForever([2])
      expect(trashIds()).toEqual([1, 3])
      db.emptyTrash()
      expect(db.trash).toEqual([])
      expect(ids()).toEqual([])
    })

    it('should not count unchanged operations as changes', () => {
      seed()
      db.removeEntries([99])
      db.restoreFromTrash([1])
      db.deleteForever([1])
      db.emptyTrash()
      expect(db.unsavedChanges).toBe(0)
    })

    it('should drop expired and damaged trash items when loading', () => {
      const now = 100 * DAY
      const database = normalizeDatabase({
        table: {
          data: [],
          trash: [
            { entry: { id: 1, name: 'fresh' }, deleted_at: now - 29 * DAY },
            { entry: { id: 2, name: 'expired' }, deleted_at: now - TRASH_RETENTION },
            { entry: 'oops', deleted_at: now },
            { entry: { id: 3 } },
          ],
        },
      }, now)
      expect(database.table.trash.map((item) => item.entry.name)).toEqual(['fresh'])
    })

    it('should keep ids unique across entries and trash', () => {
      const database = normalizeDatabase({
        table: {
          last_index: 1,
          data: [{ id: 1, name: 'A' }],
          trash: [{ entry: { id: 1, name: 'B' }, deleted_at: Date.now() }, { entry: { id: 7, name: 'C' }, deleted_at: Date.now() }],
        },
      })
      expect(database.table.data[0].id).toBe(1)
      expect(database.table.trash.map((item) => item.entry.id)).toEqual([8, 7])
      expect(database.table.last_index).toBe(8)
    })

    it('should accept databases without a trash', () => {
      expect(normalizeDatabase({ table: { data: [] } }).table.trash).toEqual([])
    })
  })
})
