import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDatabaseStore } from '../../stores/database'

describe('Database Store (Pinia)', () => {
  let db

  beforeEach(() => {
    setActivePinia(createPinia())
    db = useDatabaseStore()
  })

  describe('CRUD operations', () => {
    it('should add new item via edit window', () => {
      db.fnShowEditWindow({ sFormName: 'table', oItem: {} })
      expect(db.oEditWindow.table.window_show).toBe(true)

      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'name', mV: 'Gmail' })
      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'login', mV: 'user@gmail.com' })
      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'password', mV: 'secret123' })
      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'category', mV: 'email' })

      db.fnEditWindowSave({ sTableName: 'table', sFormName: 'table' })

      expect(db.oDatabase.table.data.length).toBe(1)
      expect(db.oDatabase.table.data[0].name).toBe('Gmail')
      expect(db.oDatabase.table.data[0].login).toBe('user@gmail.com')
      expect(db.oDatabase.table.data[0].id).toBe(1)
      expect(db.iUnsavedChanges).toBe(1)
    })

    it('should edit existing item', () => {
      db.fnShowEditWindow({ sFormName: 'table', oItem: {} })
      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'name', mV: 'Old Name' })
      db.fnEditWindowSave({ sTableName: 'table', sFormName: 'table' })

      const oItem = db.oDatabase.table.data[0]

      db.fnShowEditWindow({ sFormName: 'table', oItem })
      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'name', mV: 'New Name' })
      db.fnEditWindowSave({ sTableName: 'table', sFormName: 'table' })

      expect(db.oDatabase.table.data.length).toBe(1)
      expect(db.oDatabase.table.data[0].name).toBe('New Name')
    })

    it('should remove item', () => {
      db.fnShowEditWindow({ sFormName: 'table', oItem: {} })
      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'name', mV: 'Item 1' })
      db.fnEditWindowSave({ sTableName: 'table', sFormName: 'table' })

      db.fnShowEditWindow({ sFormName: 'table', oItem: {} })
      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'name', mV: 'Item 2' })
      db.fnEditWindowSave({ sTableName: 'table', sFormName: 'table' })

      expect(db.oDatabase.table.data.length).toBe(2)

      db.fnRemoveFromTable({
        sTableName: 'table',
        oItem: db.oDatabase.table.data[0],
      })

      expect(db.oDatabase.table.data.length).toBe(1)
      expect(db.oDatabase.table.data[0].name).toBe('Item 2')
    })

    it('should increment unsaved changes counter', () => {
      expect(db.iUnsavedChanges).toBe(0)

      db.fnShowEditWindow({ sFormName: 'table', oItem: {} })
      db.fnEditWindowSave({ sTableName: 'table', sFormName: 'table' })
      expect(db.iUnsavedChanges).toBe(1)

      db.fnShowEditWindow({ sFormName: 'table', oItem: {} })
      db.fnEditWindowSave({ sTableName: 'table', sFormName: 'table' })
      expect(db.iUnsavedChanges).toBe(2)
    })
  })

  describe('filter', () => {
    it('should update filter', () => {
      db.fnUpdateFilter({ sTableName: 'table', sName: 'name', sV: 'test' })
      expect(db.oDatabase.table.filter.name).toBe('test')
    })
  })

  describe('UI state', () => {
    it('should toggle loader', () => {
      db.bShowLoader = true
      expect(db.bShowLoader).toBe(true)
      db.bShowLoader = false
      expect(db.bShowLoader).toBe(false)
    })

    it('should toggle repo window', () => {
      db.bShowRepoWindow = false
      expect(db.bShowRepoWindow).toBe(false)
      db.bShowRepoWindow = true
      expect(db.bShowRepoWindow).toBe(true)
    })

    it('should toggle edit window', () => {
      db.fnShowEditWindow({ sFormName: 'table', oItem: {} })
      expect(db.oEditWindow.table.window_show).toBe(true)
      db.fnHideEditWindow('table')
      expect(db.oEditWindow.table.window_show).toBe(false)
    })
  })

  describe('form state', () => {
    it('should populate form when editing', () => {
      const oItem = { name: 'Test', login: 'user', password: 'pass', category: 'web' }
      db.fnShowEditWindow({ sFormName: 'table', oItem })

      expect(db.oForms.table.name).toBe('Test')
      expect(db.oForms.table.login).toBe('user')
      expect(db.oForms.table.password).toBe('pass')
      expect(db.oForms.table.category).toBe('web')
    })

    it('should clear form when adding new item', () => {
      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'name', mV: 'old' })
      db.fnShowEditWindow({ sFormName: 'table', oItem: {} })

      expect(db.oForms.table.name).toBe('')
      expect(db.oForms.table.login).toBe('')
    })
  })

  describe('database update', () => {
    it('should replace entire database', () => {
      const oNewDb = {
        table: {
          last_index: 5,
          page: 1,
          data: [{ id: 1 }, { id: 2 }],
          filter: { name: '' },
        },
      }

      db.fnUpdateDatabase(oNewDb)
      expect(db.oDatabase).toEqual(oNewDb)
      expect(db.oDatabase.table.data.length).toBe(2)
    })
  })

  describe('getters', () => {
    it('should get field value', () => {
      db.fnUpdateFormVar({ sFormName: 'table', sFieldName: 'name', mV: 'hello' })
      expect(db.fnGetFieldValue('table', 'name')).toBe('hello')
    })
  })
})
