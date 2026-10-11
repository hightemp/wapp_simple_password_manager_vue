import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import { FileSystemDriver, type RepoItem } from '@/services/FileSystemDriver'

// localStorage key kept as-is so existing users don't lose their saved repos
const REPOS_STORAGE_KEY = 'aReposList'

export const useReposStore = defineStore('repos', () => {
  // --- state ---
  const defaultRepos = ref<RepoItem[]>([
    { type: 'localstorage', name: 'Local Storage' },
  ])
  const userRepos = ref<RepoItem[]>([])
  const fileSystems = ref<Record<number, FileSystemDriver>>({})
  const selectedIndex = ref<number | null>(null)

  // --- getters ---
  const allRepos = computed(() =>
    defaultRepos.value.concat(userRepos.value)
  )
  const currentRepo = computed(() =>
    selectedIndex.value === null ? undefined : allRepos.value[selectedIndex.value]
  )
  const currentFileSystem = computed(() =>
    selectedIndex.value === null ? undefined : fileSystems.value[selectedIndex.value]
  )

  // --- actions ---
  function persist() {
    localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(userRepos.value))
  }

  /**
   * Load saved repos from localStorage. A repo can also be passed via URL
   * query params (?type=...&name=...) — it is added or updated by name.
   */
  function loadRepos() {
    try {
      userRepos.value = JSON.parse(localStorage.getItem(REPOS_STORAGE_KEY) || '[]')
      const { searchParams } = new URL(window.location.href)
      if (searchParams.get('type')) {
        const repoFromUrl = {
          type: searchParams.get('type'),
          name: searchParams.get('name'),
          login: searchParams.get('login'),
          repo: searchParams.get('repo'),
          key: searchParams.get('key'),
          url: searchParams.get('url'),
          username: searchParams.get('username'),
          password: searchParams.get('password'),
        } as RepoItem
        const existing = userRepos.value.find((repo) => repo.name == repoFromUrl.name)
        if (existing) {
          Object.assign(existing, repoFromUrl)
        } else {
          userRepos.value.push(repoFromUrl)
        }
        persist()
      }
    } catch (_) {
      /* ignore */
    }
  }

  function removeRepo(index: number) {
    userRepos.value.splice(index - defaultRepos.value.length, 1)
    persist()
  }

  function selectRepo(index: number) {
    selectedIndex.value = index
    const repos = allRepos.value
    for (const repo of repos) {
      repo.needsSave = false
    }
    repos[0].needsSave = true
    repos[index].needsSave = true
  }

  function clearRepos() {
    userRepos.value = []
    persist()
  }

  /** Add a new repo (index = -1) or replace the repo at `index` */
  function saveRepo(index: number, repo: RepoItem) {
    if (index == -1) {
      userRepos.value.push(repo)
    } else {
      userRepos.value.splice(index - defaultRepos.value.length, 1, repo)
    }
    persist()
  }

  function createFileSystem(index: number) {
    fileSystems.value[index] = markRaw(new FileSystemDriver(allRepos.value[index]))
  }

  function importRepos(repos: RepoItem[]) {
    userRepos.value = repos.filter((repo) => repo.type !== 'localstorage')
    persist()
  }

  function markCurrentRepoForSave() {
    if (currentRepo.value) currentRepo.value.needsSave = true
  }

  return {
    defaultRepos,
    userRepos,
    fileSystems,
    selectedIndex,
    allRepos,
    currentRepo,
    currentFileSystem,
    loadRepos,
    removeRepo,
    selectRepo,
    clearRepos,
    saveRepo,
    importRepos,
    createFileSystem,
    markCurrentRepoForSave,
  }
})
