import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { fnSaveFile } from '../lib'
import { useReposStore } from './repos'

export const DATABASE_PATH = 'passwords-database'
export const DATABASE_UPDATE_TIMEOUT = 30000

export const useDatabaseStore = defineStore('database', () => {
  // --- state ---
  const sPassword = ref('')

  const oStructure = ref({
    table: {
      category: { label: 'Category', type: 'text' },
      name: { label: 'Name', type: 'text' },
      login: { label: 'Login', type: 'text' },
      password: { label: 'Password', type: 'text' },
      url: { label: 'URL', type: 'text' },
      description: { label: 'Description', type: 'textarea' },
    },
  })

  const oDatabase = ref({
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

  const oForms = ref({
    table: {
      category: '',
      name: '',
      login: '',
      password: '',
      url: '',
      description: '',
    },
  })

  const oEditWindow = ref({
    table: {
      window_show: false,
      edit_item: {},
    },
  })

  const iUnsavedChanges = ref(0)

  // --- getters ---
  function fnGetFieldValue(sFormName, sFieldName) {
    return oForms.value[sFormName][sFieldName]
  }

  // --- mutations (now actions) ---
  function fnUpdateFormVar({ sFormName, sFieldName, mV }) {
    oForms.value[sFormName][sFieldName] = mV
  }

  function fnUpdateDatabaseVar({ sTableName, sVarName, mV }) {
    oDatabase.value[sTableName][sVarName] = mV
  }

  function fnUpdateFilter({ sTableName, sName, sV }) {
    oDatabase.value[sTableName].filter[sName] = sV
  }

  function fnUpdateDatabase(oNewDatabase) {
    oDatabase.value = oNewDatabase
  }

  function fnShowEditWindow({ sFormName, oItem }) {
    oEditWindow.value[sFormName].window_show = true
    oEditWindow.value[sFormName].edit_item = oItem
    for (const sN in oForms.value[sFormName]) {
      if (sN in oItem) {
        oForms.value[sFormName][sN] = oItem[sN]
      } else {
        oForms.value[sFormName][sN] = ''
      }
    }
  }

  function fnHideEditWindow(sFormName) {
    oEditWindow.value[sFormName].window_show = false
  }

  function fnEditWindowSave({ sTableName, sFormName }) {
    for (const sN in oForms.value[sFormName]) {
      oEditWindow.value[sFormName].edit_item[sN] = oForms.value[sFormName][sN]
    }
    if (!oEditWindow.value[sFormName].edit_item.id) {
      oEditWindow.value[sFormName].edit_item.id = ++oDatabase.value[sTableName].last_index
      oDatabase.value[sTableName].data.push(oEditWindow.value[sFormName].edit_item)
    }
    iUnsavedChanges.value++
  }

  function fnRemoveFromTable({ sTableName, oItem }) {
    oDatabase.value[sTableName].data = oDatabase.value[sTableName].data.filter(
      (oI) => oI.id != oItem.id
    )
    iUnsavedChanges.value++
  }

  // --- async actions ---
  function fnExportDatabase() {
    fnSaveFile('passwords-database', JSON.stringify(oDatabase.value, null, 4))
  }

  function fnImportDatabase(sData) {
    fnUpdateDatabase(JSON.parse(sData))
  }

  function fnPrepareRepo() {
    const repos = useReposStore()
    repos.fnCreateFileSystem(repos.iSelectedRepoIndex)
    repos.fnSetNeedSaveToCurrentRepo()
    fnLoadDatabase()
  }

  function fnSaveToAllDatabase() {
    const repos = useReposStore()
    for (const iIndex in repos.aAllRepos) {
      const oRepo = repos.aAllRepos[iIndex]
      if (oRepo.need_save) {
        if (!repos.oReposFileSystem[iIndex]) {
          repos.fnCreateFileSystem(iIndex)
        }
        fnSaveDatabase({ oFileSystem: repos.oReposFileSystem[iIndex] })
      }
    }
  }

  function fnSaveCurrentDatabase() {
    const repos = useReposStore()
    fnSaveDatabase({ oFileSystem: repos.oCurrentFileSystem })
  }

  function fnSaveDatabase({ oFileSystem }) {
    return oFileSystem
      .fnWriteFileCryptoJSON(DATABASE_PATH, oDatabase.value, sPassword.value)
      .then(() => {
        iUnsavedChanges.value = 0
      })
      .catch(() => {
        oFileSystem.fnReadFile(DATABASE_PATH).then(() => {
          return oFileSystem
            .fnWriteFileCryptoJSON(DATABASE_PATH, oDatabase.value, sPassword.value)
            .then(() => {
              iUnsavedChanges.value = 0
            })
        })
      })
  }

  function fnLoadDatabase() {
    const repos = useReposStore()
    sConnectionError.value = ''
    bShowLoader.value = true
    repos.oCurrentFileSystem
      .fnReadFileCryptoJSON(DATABASE_PATH, sPassword.value)
      .then((mData) => {
        if (!mData) throw 'Cannot destructure property'
        fnUpdateDatabase(mData)
        bShowLoader.value = false
      })
      .catch((oE) => {
        const sErr = oE + ''
        // Wrong password — decryption produces invalid data
        if (
          sErr.match(/Malformed UTF-8 data/) ||
          sErr.match(/SyntaxError/) ||
          sErr.match(/Unexpected token/) ||
          sErr.match(/JSON\.parse/)
        ) {
          bShowLoader.value = false
          sConnectionError.value = 'Incorrect password. Please check your master password and try again.'
          bShowRepoWindow.value = true
          return
        }
        // No database yet — create new one
        if (
          sErr.match(/Cannot destructure property/) ||
          sErr.match(/Not Found/)
        ) {
          repos.oCurrentFileSystem
            .fnWriteFileCryptoJSON(DATABASE_PATH, oDatabase.value, sPassword.value)
            .then(() => {
              repos.oCurrentFileSystem
                .fnReadFileCryptoJSON(DATABASE_PATH, sPassword.value)
                .then((mData) => {
                  fnUpdateDatabase(mData)
                  bShowLoader.value = false
                })
                .catch(() => {
                  bShowLoader.value = false
                  sConnectionError.value = 'Failed to read the newly created database.'
                  bShowRepoWindow.value = true
                })
            })
            .catch(() => {
              bShowLoader.value = false
              sConnectionError.value = 'Failed to create new database.'
              bShowRepoWindow.value = true
            })
          return
        }
        // Unknown error
        bShowLoader.value = false
        sConnectionError.value = 'Connection failed: ' + sErr
        bShowRepoWindow.value = true
      })
  }

  function fnDropDatabase() {
    localStorage.setItem(DATABASE_PATH, null)
  }

  // UI state that database actions need to access
  const bShowLoader = ref(false)
  const bShowSaveToast = ref(false)
  const bShowRepoWindow = ref(true)
  const sConnectionError = ref('')

  return {
    sPassword,
    oStructure,
    oDatabase,
    oForms,
    oEditWindow,
    iUnsavedChanges,
    bShowLoader,
    bShowSaveToast,
    bShowRepoWindow,
    sConnectionError,
    fnGetFieldValue,
    fnUpdateFormVar,
    fnUpdateDatabaseVar,
    fnUpdateFilter,
    fnUpdateDatabase,
    fnShowEditWindow,
    fnHideEditWindow,
    fnEditWindowSave,
    fnRemoveFromTable,
    fnExportDatabase,
    fnImportDatabase,
    fnPrepareRepo,
    fnSaveToAllDatabase,
    fnSaveCurrentDatabase,
    fnSaveDatabase,
    fnLoadDatabase,
    fnDropDatabase,
  }
})
