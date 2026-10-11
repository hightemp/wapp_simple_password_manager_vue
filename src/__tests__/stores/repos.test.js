import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useReposStore } from '../../stores/repos'

// Mock localStorage
const storage = {}
const localStorageMock = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value },
  removeItem: (key) => { delete storage[key] },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]) },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })

describe('Repos Store (Pinia)', () => {
  let repos

  beforeEach(() => {
    localStorageMock.clear()
    setActivePinia(createPinia())
    repos = useReposStore()
  })

  it('should have default repo list', () => {
    expect(repos.allRepos.length).toBe(1)
    expect(repos.allRepos[0].type).toBe('localstorage')
  })

  it('should add a repo', () => {
    repos.saveRepo(-1, { type: 'github', name: 'My Repo', login: 'user', repo: 'test', key: 'abc' })
    expect(repos.allRepos.length).toBe(2)
    expect(repos.allRepos[1].name).toBe('My Repo')
  })

  it('should edit a repo', () => {
    repos.saveRepo(-1, { type: 'github', name: 'Original', login: 'user', repo: 'test', key: 'abc' })
    repos.saveRepo(1, { type: 'github', name: 'Updated', login: 'user2', repo: 'test2', key: 'def' })
    expect(repos.allRepos.length).toBe(2)
    expect(repos.allRepos[1].name).toBe('Updated')
  })

  it('should remove a repo', () => {
    repos.saveRepo(-1, { type: 'github', name: 'ToDelete' })
    expect(repos.allRepos.length).toBe(2)

    repos.removeRepo(1)
    expect(repos.allRepos.length).toBe(1)
  })

  it('should clean all repos', () => {
    repos.saveRepo(-1, { type: 'github', name: 'R1' })
    repos.saveRepo(-1, { type: 'webdav', name: 'R2' })
    expect(repos.allRepos.length).toBe(3)

    repos.clearRepos()
    expect(repos.allRepos.length).toBe(1) // only default
  })

  it('should select a repo', () => {
    repos.saveRepo(-1, { type: 'github', name: 'R1' })
    repos.selectRepo(1)
    expect(repos.selectedIndex).toBe(1)
    expect(repos.currentRepo.name).toBe('R1')
  })

  it('should persist repos to localStorage', () => {
    repos.saveRepo(-1, { type: 'github', name: 'Persisted' })
    const parsed = JSON.parse(localStorageMock.getItem('aReposList'))
    expect(parsed.length).toBe(1)
    expect(parsed[0].name).toBe('Persisted')
  })

  it('should import a repo from URL params and remove them from the address bar', () => {
    window.history.replaceState(null, '', '/?type=github&name=FromUrl&login=u&repo=r&key=ghp_secret&keep=1')

    repos.loadRepos()

    expect(repos.allRepos[1].name).toBe('FromUrl')
    expect(repos.allRepos[1].key).toBe('ghp_secret')
    expect(window.location.search).toBe('?keep=1')
  })
})
