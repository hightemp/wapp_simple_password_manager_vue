import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import { FileSystemDriver, type RepoItem } from '@/services/FileSystemDriver'

// localStorage key kept as-is so existing users don't lose their saved repos
const REPOS_STORAGE_KEY = 'aReposList'

// Query params that describe a repo passed via link (?type=github&name=...)
const URL_REPO_PARAMS = ['type', 'name', 'login', 'repo', 'key', 'url', 'username', 'password'] as const

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
   * query params (?type=...&name=...) — it is added or updated by name, and the
   * params are removed from the address bar so secrets don't stay in history.
   */
  function loadRepos() {
    try {
      userRepos.value = JSON.parse(localStorage.getItem(REPOS_STORAGE_KEY) || '[]')
    } catch (_) {
      userRepos.value = []
    }

    const url = new URL(window.location.href)
    if (!url.searchParams.get('type')) return

    const repoFromUrl = Object.fromEntries(
      URL_REPO_PARAMS.map((param) => [param, url.searchParams.get(param)])
    ) as unknown as RepoItem
    const existing = userRepos.value.find((repo) => repo.name == repoFromUrl.name)
    if (existing) {
      Object.assign(existing, repoFromUrl)
    } else {
      userRepos.value.push(repoFromUrl)
    }
    persist()

    for (const param of URL_REPO_PARAMS) {
      url.searchParams.delete(param)
    }
    window.history.replaceState(window.history.state, '', url.toString())
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
