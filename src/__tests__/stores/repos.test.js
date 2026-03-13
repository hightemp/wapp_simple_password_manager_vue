import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useReposStore } from '../../stores/repos'

// Mock localStorage
const oStorage = {}
const localStorageMock = {
  getItem: (key) => oStorage[key] ?? null,
  setItem: (key, value) => { oStorage[key] = value },
  removeItem: (key) => { delete oStorage[key] },
  clear: () => { Object.keys(oStorage).forEach((k) => delete oStorage[k]) },
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
    expect(repos.aAllRepos.length).toBe(1)
    expect(repos.aAllRepos[0].type).toBe('localstorage')
  })

  it('should add a repo', () => {
    repos.fnReposUpdate({
      iIndex: -1,
      oObj: { type: 'github', name: 'My Repo', login: 'user', repo: 'test', key: 'abc' },
    })
    expect(repos.aAllRepos.length).toBe(2)
    expect(repos.aAllRepos[1].name).toBe('My Repo')
  })

  it('should edit a repo', () => {
    repos.fnReposUpdate({
      iIndex: -1,
      oObj: { type: 'github', name: 'Original', login: 'user', repo: 'test', key: 'abc' },
    })
    repos.fnReposUpdate({
      iIndex: 1,
      oObj: { type: 'github', name: 'Updated', login: 'user2', repo: 'test2', key: 'def' },
    })
    expect(repos.aAllRepos.length).toBe(2)
    expect(repos.aAllRepos[1].name).toBe('Updated')
  })

  it('should remove a repo', () => {
    repos.fnReposUpdate({
      iIndex: -1,
      oObj: { type: 'github', name: 'ToDelete' },
    })
    expect(repos.aAllRepos.length).toBe(2)

    repos.fnReposRemove(1)
    expect(repos.aAllRepos.length).toBe(1)
  })

  it('should clean all repos', () => {
    repos.fnReposUpdate({ iIndex: -1, oObj: { type: 'github', name: 'R1' } })
    repos.fnReposUpdate({ iIndex: -1, oObj: { type: 'webdav', name: 'R2' } })
    expect(repos.aAllRepos.length).toBe(3)

    repos.fnReposClean()
    expect(repos.aAllRepos.length).toBe(1) // only default
  })

  it('should select a repo', () => {
    repos.fnReposUpdate({ iIndex: -1, oObj: { type: 'github', name: 'R1' } })
    repos.fnReposSelect(1)
    expect(repos.iSelectedRepoIndex).toBe(1)
    expect(repos.oCurrentRepo.name).toBe('R1')
  })

  it('should persist repos to localStorage', () => {
    repos.fnReposUpdate({ iIndex: -1, oObj: { type: 'github', name: 'Persisted' } })
    const aParsed = JSON.parse(localStorageMock.getItem('aReposList'))
    expect(aParsed.length).toBe(1)
    expect(aParsed[0].name).toBe('Persisted')
  })
})
