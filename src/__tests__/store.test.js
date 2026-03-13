import { describe, it, expect, beforeEach } from 'vitest'
import { createStore } from 'vuex'

// Re-create a minimal store for testing mutations and getters
// This tests store logic without needing the full FileSystemDriver

function createTestStore() {
  return createStore({
    state() {
      return {
        bShowRepoWindow: true,
        aDefaultRepoList: [
          { type: 'localstorage', name: 'Локальное хранилище' },
        ],
        aReposList: [],
        oReposFileSystem: {},
        iSelectedRepoIndex: null,
        bShowLoader: false,
        bShowSaveToast: false,
        sPassword: '',
        oStructure: {
          table: {
            category: { label: 'Категория', type: 'text' },
            name: { label: 'Название', type: 'text' },
            login: { label: 'Логин', type: 'text' },
            password: { label: 'Пароль', type: 'text' },
          },
        },
        oDatabase: {
          table: {
            last_index: 0,
            page: 1,
            data: [],
            selection_id: null,
            filter: { category: '', name: '', login: '', password: '' },
          },
        },
        oEditWindow: {
          table: {
            window_show: false,
            edit_item: {},
          },
        },
        oForms: {
          table: {
            category: '',
            name: '',
            login: '',
            password: '',
          },
        },
        iUnsavedChanges: 0,
      }
    },
    mutations: {
      fnUpdateFormVar(state, { sFormName, sFieldName, mV }) {
        state.oForms[sFormName][sFieldName] = mV
      },
      fnUpdateDatabaseVar(state, { sTableName, sVarName, mV }) {
        state.oDatabase[sTableName][sVarName] = mV
      },
      fnUpdateVar(state, { sName, sV }) {
        state[sName] = sV
      },
      fnUpdateFilter(state, { sTableName, sName, sV }) {
        state.oDatabase[sTableName].filter[sName] = sV
      },
      fnShowEditWindow(state, { sFormName, oItem }) {
        state.oEditWindow[sFormName].window_show = true
        state.oEditWindow[sFormName].edit_item = oItem
        for (var sN in state.oForms[sFormName]) {
          if (sN in oItem) {
            state.oForms[sFormName][sN] = oItem[sN]
          } else {
            state.oForms[sFormName][sN] = ''
          }
        }
      },
      fnHideEditWindow(state, sFormName) {
        state.oEditWindow[sFormName].window_show = false
      },
      fnEditWindowSave(state, { sTableName, sFormName }) {
        for (var sN in state.oForms[sFormName]) {
          state.oEditWindow[sFormName].edit_item[sN] = state.oForms[sFormName][sN]
        }
        if (!state.oEditWindow[sFormName].edit_item.id) {
          state.oEditWindow[sFormName].edit_item.id = ++state.oDatabase[sTableName].last_index
          state.oDatabase[sTableName].data.push(state.oEditWindow[sFormName].edit_item)
        }
        state.iUnsavedChanges++
      },
      fnRemoveFromTable(state, { sTableName, oItem }) {
        state.oDatabase[sTableName].data = state.oDatabase[sTableName].data.filter(
          (oI) => oI.id != oItem.id
        )
        state.iUnsavedChanges++
      },
      fnUpdateDatabase(state, oDatabase) {
        state.oDatabase = oDatabase
      },
      fnShowLoader(state) { state.bShowLoader = true },
      fnHideLoader(state) { state.bShowLoader = false },
      fnShowRepoWindow(state) { state.bShowRepoWindow = true },
      fnHideRepoWindow(state) { state.bShowRepoWindow = false },
    },
    getters: {
      fnGetFieldValue: (state) => (sFormName, sFieldName) => {
        return state.oForms[sFormName][sFieldName]
      },
      aReposList(state) {
        return state.aDefaultRepoList.concat(state.aReposList)
      },
    },
  })
}

describe('Vuex Store', () => {
  let store

  beforeEach(() => {
    store = createTestStore()
  })

  describe('mutations: CRUD operations', () => {
    it('should add new item via edit window', () => {
      // Open edit window with empty item
      store.commit('fnShowEditWindow', { sFormName: 'table', oItem: {} })
      expect(store.state.oEditWindow.table.window_show).toBe(true)

      // Fill form
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'name', mV: 'Gmail' })
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'login', mV: 'user@gmail.com' })
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'password', mV: 'secret123' })
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'category', mV: 'email' })

      // Save
      store.commit('fnEditWindowSave', { sTableName: 'table', sFormName: 'table' })

      expect(store.state.oDatabase.table.data.length).toBe(1)
      expect(store.state.oDatabase.table.data[0].name).toBe('Gmail')
      expect(store.state.oDatabase.table.data[0].login).toBe('user@gmail.com')
      expect(store.state.oDatabase.table.data[0].id).toBe(1)
      expect(store.state.iUnsavedChanges).toBe(1)
    })

    it('should edit existing item', () => {
      // Add item first
      store.commit('fnShowEditWindow', { sFormName: 'table', oItem: {} })
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'name', mV: 'Old Name' })
      store.commit('fnEditWindowSave', { sTableName: 'table', sFormName: 'table' })

      const oItem = store.state.oDatabase.table.data[0]

      // Edit it
      store.commit('fnShowEditWindow', { sFormName: 'table', oItem })
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'name', mV: 'New Name' })
      store.commit('fnEditWindowSave', { sTableName: 'table', sFormName: 'table' })

      expect(store.state.oDatabase.table.data.length).toBe(1) // no duplicates
      expect(store.state.oDatabase.table.data[0].name).toBe('New Name')
    })

    it('should remove item', () => {
      // Add two items
      store.commit('fnShowEditWindow', { sFormName: 'table', oItem: {} })
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'name', mV: 'Item 1' })
      store.commit('fnEditWindowSave', { sTableName: 'table', sFormName: 'table' })

      store.commit('fnShowEditWindow', { sFormName: 'table', oItem: {} })
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'name', mV: 'Item 2' })
      store.commit('fnEditWindowSave', { sTableName: 'table', sFormName: 'table' })

      expect(store.state.oDatabase.table.data.length).toBe(2)

      // Remove first
      store.commit('fnRemoveFromTable', {
        sTableName: 'table',
        oItem: store.state.oDatabase.table.data[0],
      })

      expect(store.state.oDatabase.table.data.length).toBe(1)
      expect(store.state.oDatabase.table.data[0].name).toBe('Item 2')
    })

    it('should increment unsaved changes counter', () => {
      expect(store.state.iUnsavedChanges).toBe(0)

      store.commit('fnShowEditWindow', { sFormName: 'table', oItem: {} })
      store.commit('fnEditWindowSave', { sTableName: 'table', sFormName: 'table' })
      expect(store.state.iUnsavedChanges).toBe(1)

      store.commit('fnShowEditWindow', { sFormName: 'table', oItem: {} })
      store.commit('fnEditWindowSave', { sTableName: 'table', sFormName: 'table' })
      expect(store.state.iUnsavedChanges).toBe(2)
    })
  })

  describe('mutations: filter', () => {
    it('should update filter', () => {
      store.commit('fnUpdateFilter', { sTableName: 'table', sName: 'name', sV: 'test' })
      expect(store.state.oDatabase.table.filter.name).toBe('test')
    })
  })

  describe('mutations: UI state', () => {
    it('should toggle loader', () => {
      store.commit('fnShowLoader')
      expect(store.state.bShowLoader).toBe(true)
      store.commit('fnHideLoader')
      expect(store.state.bShowLoader).toBe(false)
    })

    it('should toggle repo window', () => {
      store.commit('fnHideRepoWindow')
      expect(store.state.bShowRepoWindow).toBe(false)
      store.commit('fnShowRepoWindow')
      expect(store.state.bShowRepoWindow).toBe(true)
    })

    it('should toggle edit window', () => {
      store.commit('fnShowEditWindow', { sFormName: 'table', oItem: {} })
      expect(store.state.oEditWindow.table.window_show).toBe(true)
      store.commit('fnHideEditWindow', 'table')
      expect(store.state.oEditWindow.table.window_show).toBe(false)
    })
  })

  describe('mutations: form state', () => {
    it('should populate form when editing', () => {
      const oItem = { name: 'Test', login: 'user', password: 'pass', category: 'web' }
      store.commit('fnShowEditWindow', { sFormName: 'table', oItem })

      expect(store.state.oForms.table.name).toBe('Test')
      expect(store.state.oForms.table.login).toBe('user')
      expect(store.state.oForms.table.password).toBe('pass')
      expect(store.state.oForms.table.category).toBe('web')
    })

    it('should clear form when adding new item', () => {
      // First set some values
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'name', mV: 'old' })

      // Open with empty item
      store.commit('fnShowEditWindow', { sFormName: 'table', oItem: {} })

      expect(store.state.oForms.table.name).toBe('')
      expect(store.state.oForms.table.login).toBe('')
    })
  })

  describe('mutations: database update', () => {
    it('should replace entire database', () => {
      const oNewDb = {
        table: {
          last_index: 5,
          page: 1,
          data: [{ id: 1 }, { id: 2 }],
          filter: { name: '' },
        },
      }

      store.commit('fnUpdateDatabase', oNewDb)
      expect(store.state.oDatabase).toEqual(oNewDb)
      expect(store.state.oDatabase.table.data.length).toBe(2)
    })
  })

  describe('getters', () => {
    it('should get field value', () => {
      store.commit('fnUpdateFormVar', { sFormName: 'table', sFieldName: 'name', mV: 'hello' })
      expect(store.getters.fnGetFieldValue('table', 'name')).toBe('hello')
    })

    it('should combine default and custom repos', () => {
      expect(store.getters.aReposList.length).toBe(1)
      expect(store.getters.aReposList[0].type).toBe('localstorage')
    })
  })
})
