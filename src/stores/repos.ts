import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import { FileSystemDriver } from '../FileSystemDriver'

export const useReposStore = defineStore('repos', () => {
  // --- state ---
  const aDefaultRepoList = ref([
    { type: 'localstorage', name: 'Локальное хранилище' },
  ])
  const aReposList = ref([])
  const oReposFileSystem = ref({})
  const iSelectedRepoIndex = ref(null)

  // --- getters ---
  const aAllRepos = computed(() =>
    aDefaultRepoList.value.concat(aReposList.value)
  )
  const oCurrentRepo = computed(() =>
    aAllRepos.value[iSelectedRepoIndex.value]
  )
  const oCurrentFileSystem = computed(() =>
    oReposFileSystem.value[iSelectedRepoIndex.value]
  )

  // --- actions ---
  function fnLoadRepos() {
    try {
      aReposList.value = JSON.parse(localStorage.getItem('aReposList') || '[]')
      const parsedUrl = new URL(window.location)
      const { searchParams } = parsedUrl
      if (searchParams.get('type')) {
        const oNewItem = {
          type: searchParams.get('type'),
          name: searchParams.get('name'),
          login: searchParams.get('login'),
          repo: searchParams.get('repo'),
          key: searchParams.get('key'),
          url: searchParams.get('url'),
          username: searchParams.get('username'),
          password: searchParams.get('password'),
        }
        const oItem = aReposList.value.find((oI) => oI.name == oNewItem.name)
        if (oItem) {
          for (const sK in oNewItem) {
            oItem[sK] = oNewItem[sK]
          }
        } else {
          aReposList.value.push(oNewItem)
        }
        localStorage.setItem('aReposList', JSON.stringify(aReposList.value))
      }
    } catch (_) {
      /* ignore */
    }
  }

  function fnReposRemove(iIndex) {
    aReposList.value.splice(iIndex - aDefaultRepoList.value.length, 1)
    localStorage.setItem('aReposList', JSON.stringify(aReposList.value))
  }

  function fnReposSelect(iIndex) {
    iSelectedRepoIndex.value = iIndex
    const aRepos = aAllRepos.value
    for (const oRepo of aRepos) {
      oRepo.need_save = false
    }
    aRepos[0].need_save = true
    aRepos[iSelectedRepoIndex.value].need_save = true
  }

  function fnReposClean() {
    aReposList.value = []
    localStorage.setItem('aReposList', JSON.stringify(aReposList.value))
  }

  function fnReposUpdate({ iIndex, oObj }) {
    if (iIndex == -1) {
      aReposList.value.push(oObj)
    } else {
      aReposList.value.splice(iIndex - aDefaultRepoList.value.length, 1, oObj)
    }
    localStorage.setItem('aReposList', JSON.stringify(aReposList.value))
  }

  function fnCreateFileSystem(iIndex) {
    const aRepos = aAllRepos.value
    oReposFileSystem.value[iIndex] = markRaw(new FileSystemDriver(aRepos[iIndex]))
  }

  function fnSetNeedSaveToCurrentRepo() {
    const aRepos = aAllRepos.value
    aRepos[iSelectedRepoIndex.value].need_save = true
  }

  return {
    aDefaultRepoList,
    aReposList,
    oReposFileSystem,
    iSelectedRepoIndex,
    aAllRepos,
    oCurrentRepo,
    oCurrentFileSystem,
    fnLoadRepos,
    fnReposRemove,
    fnReposSelect,
    fnReposClean,
    fnReposUpdate,
    fnCreateFileSystem,
    fnSetNeedSaveToCurrentRepo,
  }
})
