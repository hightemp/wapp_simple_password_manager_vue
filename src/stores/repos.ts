import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'
import { FileSystemDriver, type RepoItem } from '@/services/FileSystemDriver'

// localStorage key kept as-is so existing users don't lose their saved repos
const REPOS_STORAGE_KEY = 'aReposList'

// Query params that describe a repo passed via link (?type=github&name=...)
const URL_REPO_PARAMS = ['type', 'name', 'login', 'repo', 'key', 'url', 'username', 'password'] as const

/** Drop runtime flags older versions stored on repo objects */
function stripRuntimeFields(repo: RepoItem & { needsSave?: unknown; need_save?: unknown }): RepoItem {
  const { needsSave: _needsSave, need_save: _legacyNeedSave, ...rest } = repo
  return rest
}

export const useReposStore = defineStore('repos', () => {
  // --- state ---
  const defaultRepos = ref<RepoItem[]>([
    { type: 'localstorage', name: 'Local Storage' },
  ])
  const userRepos = ref<RepoItem[]>([])
  const fileSystems = ref<Record<number, FileSystemDriver>>({})
  const selectedIndex = ref<number | null>(null)
  // Indexes (in allRepos) the database is saved to — runtime only, never persisted
  const reposToSave = ref(new Set<number>())

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
    localStorage.setItem(REPOS_STORAGE_KEY, JSON.stringify(userRepos.value.map(stripRuntimeFields)))
  }

  /**
   * Load saved repos from localStorage. A repo can also be passed via URL
   * query params (?type=...&name=...) — it is added or updated by name, and the
   * params are removed from the address bar so secrets don't stay in history.
   */
  function loadRepos() {
    try {
      userRepos.value = JSON.parse(localStorage.getItem(REPOS_STORAGE_KEY) || '[]').map(stripRuntimeFields)
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

    // Indexes after the removed repo shift down by one
    const shift = (i: number) => (i > index ? i - 1 : i)
    reposToSave.value = new Set([...reposToSave.value].filter((i) => i !== index).map(shift))
    fileSystems.value = Object.fromEntries(
      Object.entries(fileSystems.value)
        .filter(([i]) => Number(i) !== index)
        .map(([i, fileSystem]) => [shift(Number(i)), fileSystem])
    )
    if (selectedIndex.value === index) selectedIndex.value = null
    else if (selectedIndex.value !== null) selectedIndex.value = shift(selectedIndex.value)
  }

  /** Select the repo to work with; the database is saved to it and to Local Storage */
  function selectRepo(index: number) {
    selectedIndex.value = index
    reposToSave.value = new Set([0, index])
  }

  /** Forget runtime state of user repos (their indexes are no longer valid) */
  function resetUserRepoState() {
    const isDefault = (i: number) => i < defaultRepos.value.length
    reposToSave.value = new Set([...reposToSave.value].filter(isDefault))
    fileSystems.value = Object.fromEntries(
      Object.entries(fileSystems.value).filter(([i]) => isDefault(Number(i)))
    )
    if (selectedIndex.value !== null && !isDefault(selectedIndex.value)) selectedIndex.value = null
  }

  function clearRepos() {
    userRepos.value = []
    persist()
    resetUserRepoState()
  }

  /** Add a new repo (index = -1) or replace the repo at `index` */
  function saveRepo(index: number, repo: RepoItem) {
    if (index == -1) {
      userRepos.value.push(repo)
    } else {
      userRepos.value.splice(index - defaultRepos.value.length, 1, repo)
      // Settings changed — the driver must be recreated with the new credentials
      delete fileSystems.value[index]
    }
    persist()
  }

  function createFileSystem(index: number) {
    fileSystems.value[index] = markRaw(new FileSystemDriver(allRepos.value[index]))
  }

  function importRepos(repos: RepoItem[]) {
    userRepos.value = repos.filter((repo) => repo.type !== 'localstorage').map(stripRuntimeFields)
    persist()
    resetUserRepoState()
  }

  function markCurrentRepoForSave() {
    if (selectedIndex.value !== null) reposToSave.value.add(selectedIndex.value)
  }

  return {
    defaultRepos,
    userRepos,
    fileSystems,
    selectedIndex,
    reposToSave,
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
