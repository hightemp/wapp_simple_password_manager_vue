<template>
  <div class="wrapper">
    <div class="left-panel">
      <button v-for="(oMenuItem, iI) in aMenu" :key="iI" class="btn btn-menu" @click="fnClickLeftMenu(oMenuItem)" :title="oMenuItem.title">
        <i :class="'bi '+oMenuItem.icon"></i>
        <template v-if="oMenuItem.id=='save' && db.iUnsavedChanges">
          <span class="badge">{{db.iUnsavedChanges}}</span>
        </template>
      </button>
      <button class="btn btn-import" title="Импортировать"><i class="bi bi-box-arrow-in-up"></i><label><input type="file" ref="file_selector" @change="fnFileImportChange" /></label></button>
      <div class="spacer"></div>
      <button class="btn btn-menu" @click="fnToggleTheme" title="Тема">
        <i :class="'bi '+(bDarkTheme ? 'bi-sun' : 'bi-moon')"></i>
      </button>
    </div>
    <div class="table-panel">
      <div class="table-actions-panel">
        <div class="spacer"></div>
        <button class="btn btn-light" @click="fnFirst"><i class="bi bi-chevron-bar-left"></i></button>
        <button class="btn btn-light" @click="fnPrevShift"><i class="bi bi-chevron-double-left"></i></button>
        <button class="btn btn-light" @click="fnPrev"><i class="bi bi-chevron-compact-left"></i></button>
        <div class="input-group mb-3">
            <input type="text" class="form-control" v-model="iPage" />
            <span class="input-group-text" id="basic-addon1">/ {{iMaxPages}}</span>
        </div>
        <button class="btn btn-light" @click="fnNext"><i class="bi bi-chevron-compact-right"></i></button>
        <button class="btn btn-light" @click="fnNextShift"><i class="bi bi-chevron-double-right"></i></button>
        <button class="btn btn-light" @click="fnLast"><i class="bi bi-chevron-bar-right"></i></button>
        <div class="spacer"></div>
      </div>
      <div class="data-table">
          <div class="table-row header" :style="sHeaderStyles">
              <div v-for="(oSF, sK) in oStruct" :key="sK" class="cell header">
                  {{oSF.label}}
                  <input type="text" class="form-control" @input="(oE) => fnFilterInput(oE, sK)" :value="oTable.filter[sK]"  />
              </div>
          </div>
          <template v-for="oRow in aSlicedRows" :key="oRow">
              <div 
                  :class="'table-row '+(oSelectedItem && oSelectedItem.id == oRow.id ? 'active' : '')" 
                  :style="sHeaderStyles" 
                  @click="() => fnItemClick(oRow)"
                  @dblclick="() => fnDblItemClick(oRow)"
              >
                  <div v-for="(oSF, sK) in oStruct" :key="sK" class="cell">
                    <template v-if="oRow[sK] && sK=='url'">
                      <a :href="oRow[sK]">{{oRow[sK]}}</a>
                    </template>
                    <template v-else>
                      <template v-if="oRow[sK] && (sK=='password' || sK=='login')">
                        <button 
                          class="btn btn-light copy-to-clipboard"
                          @click="fnCopyToClipboard(oRow[sK])"
                        ><i class="bi bi-clipboard-check"></i></button>
                      </template>
                      <template v-if="sK=='password' && oRow[sK]">
                        <span class="masked-password" @click="fnToggleMask($event)">••••••••</span>
                        <span class="real-password" style="display:none">{{oRow[sK]}}</span>
                      </template>
                      <template v-else>
                        {{oRow[sK]}}
                      </template>
                    </template>
                  </div>
              </div>
          </template>
      </div>
    </div>
  </div>

  <EditWindow title="Редактирование" :form_name="sTableName" :table_name="sTableName" />
  <RepoWindow />
  <SavedToast />
  <LoaderOverlay />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, useTemplateRef } from 'vue'
import { useDatabaseStore } from './stores/database'
import { useReposStore } from './stores/repos'
import { fnDebounce } from './lib'

import EditWindow from './components/edit_window.vue'
import RepoWindow from './components/repo_window.vue'
import SavedToast from './components/saved_toast.vue'
import LoaderOverlay from './components/loader.vue'

const db = useDatabaseStore()
const repos = useReposStore()

const file_selector = useTemplateRef('file_selector')

// --- local state ---
const aMenu = [
  { id: 'repo-window', title: 'Выбрать репозиторий', icon: 'bi-person-fill' },
  { id: 'save', title: 'Сохранить', icon: 'bi-arrow-up-square' },
  { id: 'add', title: 'Добавить', icon: 'bi-plus-lg' },
  { id: 'edit', title: 'Редактировать', icon: 'bi-pencil' },
  { id: 'remove', title: 'Удалить', icon: 'bi-trash' },
  { id: 'export', title: 'Экспортировать', icon: 'bi-box-arrow-down' },
]

const oSelectedItem = ref(null)
const sTableName = 'table'
const bDarkTheme = ref(localStorage.getItem('bDarkTheme') === 'true')
let iAutoLockTimer = null
const iAutoLockTimeout = 5 * 60 * 1000

// --- computed ---
const oStruct = computed(() => db.oStructure.table)
const oTable = computed(() => db.oDatabase.table)
const iStructLength = computed(() => Object.keys(oStruct.value).length)
const sHeaderStyles = computed(() => ({
  display: 'grid',
  'grid-template-columns': '1fr '.repeat(iStructLength.value),
}))

const iPageCount = computed(() => Math.floor((window.innerHeight - 60 - 30) / 27))

const iPage = computed({
  get: () => db.oDatabase.table.page ?? 1,
  set: (sV) => { db.oDatabase.table.page = sV * 1 },
})

const aRows = computed(() => {
  return oTable.value.data.filter((oI) => {
    let bResult = true
    for (const sK in oTable.value.filter) {
      if (oTable.value.filter[sK]) {
        bResult = bResult && ~oI[sK].indexOf(oTable.value.filter[sK])
      }
    }
    return bResult
  })
})

const iMaxPages = computed(() => Math.ceil(aRows.value.length / iPageCount.value))

const aSlicedRows = computed(() =>
  aRows.value.slice((iPage.value - 1) * iPageCount.value, iPage.value * iPageCount.value)
)

// --- methods ---
function fnFirst() { iPage.value = 1 }
function fnPrevShift() { if (iPage.value > 5) iPage.value -= 5 }
function fnPrev() { if (iPage.value > 1) iPage.value -= 1 }
function fnLast() { iPage.value = iMaxPages.value }
function fnNextShift() { if (iPage.value < iMaxPages.value - 5) iPage.value += 5 }
function fnNext() { if (iPage.value < iMaxPages.value) iPage.value += 1 }

function fnCopyToClipboard(sText) {
  navigator.clipboard.writeText(sText)
}

const fnFilterInput = fnDebounce((oE, sK) => {
  db.fnUpdateFilter({ sTableName, sName: sK, sV: oE.target.value })
}, 300)

function fnClickLeftMenu(oItem) {
  if (oItem.id == 'repo-window') db.bShowRepoWindow = true
  if (oItem.id == 'save') fnSaveAll()
  if (oItem.id == 'add') fnAddClick()
  if (oItem.id == 'edit') fnEditClick()
  if (oItem.id == 'remove') fnRemoveClick()
  if (oItem.id == 'export') db.fnExportDatabase()
}

function fnItemClick(oRow) { oSelectedItem.value = oRow }

function fnDblItemClick() {
  db.fnShowEditWindow({ sFormName: sTableName, oItem: oSelectedItem.value })
}

function fnAddClick() {
  db.fnShowEditWindow({ sFormName: sTableName, oItem: {} })
}

function fnEditClick() {
  if (oSelectedItem.value) {
    db.fnShowEditWindow({ sFormName: sTableName, oItem: oSelectedItem.value })
  } else {
    alert('Нужно выбрать')
  }
}

function fnRemoveClick() {
  if (oSelectedItem.value) {
    if (confirm('Вы уверены что хотите удалить эту запись?')) {
      db.fnRemoveFromTable({ sTableName, oItem: oSelectedItem.value })
      oSelectedItem.value = null
    }
  } else {
    alert('Нужно выбрать')
  }
}

function fnSaveAll() {
  db.fnSaveToAllDatabase()
  db.bShowSaveToast = true
}

function fnImport() {
  const oFile = file_selector.value.files[0]
  const reader = new FileReader()
  reader.readAsText(oFile)
  reader.onload = () => db.fnImportDatabase(reader.result)
}

function fnFileImportChange() { fnImport() }

function fnToggleMask(oE) {
  const oMasked = oE.target
  const oReal = oMasked.nextElementSibling
  if (oReal && oReal.style.display === 'none') {
    oReal.style.display = ''
    oMasked.style.display = 'none'
  }
  setTimeout(() => {
    oReal.style.display = 'none'
    oMasked.style.display = ''
  }, 3000)
}

function fnToggleTheme() {
  bDarkTheme.value = !bDarkTheme.value
  localStorage.setItem('bDarkTheme', bDarkTheme.value)
  document.documentElement.setAttribute('data-theme', bDarkTheme.value ? 'dark' : 'light')
}

function fnResetAutoLock() {
  clearTimeout(iAutoLockTimer)
  iAutoLockTimer = setTimeout(() => {
    if (db.sPassword) {
      db.sPassword = ''
      db.bShowRepoWindow = true
    }
  }, iAutoLockTimeout)
}

// --- lifecycle ---
onMounted(() => {
  repos.fnLoadRepos()

  if (bDarkTheme.value) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.keyCode === 83) {
      e.preventDefault()
      fnSaveAll()
    }
  })

  const fnActivity = () => fnResetAutoLock()
  document.addEventListener('mousemove', fnActivity)
  document.addEventListener('keydown', fnActivity)
  document.addEventListener('click', fnActivity)
  fnResetAutoLock()
})
</script>

<style>

</style>
