import { describe, it, expect, beforeEach } from 'vitest'
import { FileSystemDriver, NotFoundError, ConflictError, AuthError, describeAccessError } from '../../services/FileSystemDriver'
import { DecryptionError } from '../../utils/crypto'
import DES from 'crypto-js/tripledes.js'

// Mock localStorage
const storage = {}
const localStorageMock = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value },
  removeItem: (key) => { delete storage[key] },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]) },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('FileSystemDriver', () => {
  let driver

  beforeEach(() => {
    localStorageMock.clear()
    driver = new FileSystemDriver({ type: 'localstorage', name: 'test' })
  })

  describe('localStorage operations', () => {
    it('should write and read a file', async () => {
      await driver.writeFile('test-file', 'hello world')
      const { data } = await driver.readFile('test-file')
      expect(data).toBe('hello world')
    })

    it('should write and read JSON', async () => {
      const payload = { name: 'test', value: 42 }
      await driver.writeJson('test.json', payload)
      const result = await driver.readJson('test.json')
      expect(result).toEqual(payload)
    })

    it('should write and read encrypted JSON (v3)', async () => {
      const password = 'my-secret'
      const payload = { table: { data: [{ id: 1, name: 'entry' }] } }

      await driver.writeEncryptedJson('encrypted.dat', payload, password)
      const result = await driver.readEncryptedJson('encrypted.dat', password)

      expect(result).toEqual(payload)
    })

    it('should read legacy 3DES encrypted files (backward compat)', async () => {
      const password = 'old-password'
      const payload = { table: { data: [{ id: 1, name: 'legacy-entry' }] } }

      // Simulate old app writing data with 3DES directly
      const legacyEncrypted = DES.encrypt(JSON.stringify(payload, null, 4), password).toString()
      localStorageMock.setItem('legacy-db', legacyEncrypted)

      // New driver should read it correctly
      const result = await driver.readEncryptedJson('legacy-db', password)
      expect(result).toEqual(payload)
    })

    it('should handle migration: read v1, save as v3, read v3', async () => {
      const password = 'migrate-me'
      const payload = {
        table: {
          last_index: 3,
          data: [
            { id: 1, category: 'email', name: 'Gmail', login: 'user@gmail.com', password: 'p@ss1' },
            { id: 2, category: 'social', name: 'Twitter', login: 'user', password: 'p@ss2' },
          ],
        },
      }

      // Write with old 3DES format
      const legacy = DES.encrypt(JSON.stringify(payload, null, 4), password).toString()
      localStorageMock.setItem('passwords-database', legacy)

      // Read with new driver (should auto-detect v1)
      const loaded = await driver.readEncryptedJson('passwords-database', password)
      expect(loaded).toEqual(payload)

      // Save with new driver (writes v3 format)
      await driver.writeEncryptedJson('passwords-database', loaded, password)

      // Read again (should now read v3 format)
      const reloaded = await driver.readEncryptedJson('passwords-database', password)
      expect(reloaded).toEqual(payload)

      // Verify it's actually in v3 format now
      const stored = localStorageMock.getItem('passwords-database')
      const parsed = JSON.parse(stored)
      expect(parsed.v).toBe(3)
      expect(parsed.salt).toBeTruthy()
    })

    it('should reject a wrong password with DecryptionError', async () => {
      await driver.writeEncryptedJson('encrypted.dat', { a: 1 }, 'right')
      await expect(driver.readEncryptedJson('encrypted.dat', 'wrong')).rejects.toBeInstanceOf(DecryptionError)
    })

    it('should reject on missing file for encrypted read', async () => {
      await expect(
        driver.readEncryptedJson('nonexistent', 'password')
      ).rejects.toBeInstanceOf(NotFoundError)
    })
  })

  describe('initialization', () => {
    it('should create localstorage driver', () => {
      const d = new FileSystemDriver({ type: 'localstorage', name: 'test' })
      expect(d.repo.type).toBe('localstorage')
      expect(d.octokit).toBeNull()
      expect(d.webdav).toBeNull()
    })

    it('should set repo item', () => {
      const repo = { type: 'localstorage', name: 'my-storage' }
      const d = new FileSystemDriver(repo)
      expect(d.repo).toBe(repo)
    })
  })

  describe('GitHub write', () => {
    function githubDriver(getContent) {
      const d = new FileSystemDriver({ type: 'github', name: 'gh', login: 'me', repo: 'vault', key: 'ghp_x' })
      const calls = []
      d.octokit = {
        rest: {
          repos: {
            getContent,
            createOrUpdateFileContents: async (params) => {
              calls.push(params)
              return { data: { content: { sha: 'sha-after-' + calls.length } } }
            },
          },
        },
      }
      return { d, calls }
    }

    it('should fetch the SHA before updating a file not read in this session', async () => {
      const { d, calls } = githubDriver(async () => ({ data: { sha: 'remote-sha' } }))
      await d.writeFile('/db', 'x')
      expect(calls[0].sha).toBe('remote-sha')
      expect(calls[0].path).toBe('db')
    })

    it('should create the file (no SHA) when it does not exist', async () => {
      const { d, calls } = githubDriver(async () => { throw Object.assign(new Error('Not Found'), { status: 404 }) })
      await d.writeFile('db', 'x')
      expect(calls[0].sha).toBeUndefined()
    })

    it('should reuse the SHA returned by the previous write', async () => {
      let lookups = 0
      const { d, calls } = githubDriver(async () => { lookups++; return { data: { sha: 'remote-sha' } } })
      await d.writeFile('db', 'x')
      await d.writeFile('db', 'y')
      expect(lookups).toBe(1)
      expect(calls[1].sha).toBe('sha-after-1')
    })

    it('should convert a 404 on read into NotFoundError', async () => {
      const { d } = githubDriver(async () => { throw Object.assign(new Error('Not Found'), { status: 404 }) })
      await expect(d.readFile('db')).rejects.toBeInstanceOf(NotFoundError)
    })

    it('should turn 401 into an AuthError about the token', async () => {
      const { d } = githubDriver(async () => { throw Object.assign(new Error('Bad credentials'), { status: 401 }) })
      await expect(d.writeFile('db', 'x')).rejects.toBeInstanceOf(AuthError)
      await expect(d.readFile('db')).rejects.toThrow(/token: it is invalid, expired or revoked/)
    })

    it('should send the SHA it read and report a 409 as ConflictError', async () => {
      const { d, calls } = githubDriver(async () => ({ data: { sha: 'read-sha', content: btoa('x') } }))
      await d.readFile('db')
      d.octokit.rest.repos.createOrUpdateFileContents = async (params) => {
        calls.push(params)
        throw Object.assign(new Error('is at other-sha but expected read-sha'), { status: 409 })
      }
      await expect(d.writeFile('db', 'y')).rejects.toBeInstanceOf(ConflictError)
      expect(calls[0].sha).toBe('read-sha')
    })

    it('should overwrite without a conflict check when forced', async () => {
      const { d, calls } = githubDriver(async () => ({ data: { sha: 'remote-sha', content: btoa('x') } }))
      d.versions.db = 'stale-sha'
      await d.writeFile('db', 'y', { force: true })
      expect(calls[0].sha).toBe('remote-sha')
    })

    it('should explain a 404 on write (repository missing or not visible to the token)', async () => {
      const { d } = githubDriver(async () => { throw Object.assign(new Error('Not Found'), { status: 404 }) })
      d.octokit.rest.repos.createOrUpdateFileContents = async () => { throw Object.assign(new Error('Not Found'), { status: 404 }) }
      await expect(d.writeFile('db', 'x')).rejects.toThrow('Repository "me/vault" was not found')
    })
  })

  describe('localStorage conflicts', () => {
    it('should detect a change made by another tab', async () => {
      await driver.writeFile('db', 'mine')
      localStorageMock.setItem('db', 'other tab')
      await expect(driver.writeFile('db', 'mine 2')).rejects.toBeInstanceOf(ConflictError)
      expect(localStorageMock.getItem('db')).toBe('other tab')

      await driver.readFile('db')
      await driver.writeFile('db', 'mine 2')
      expect(localStorageMock.getItem('db')).toBe('mine 2')
    })

    it('should not check files this session never read or wrote', async () => {
      localStorageMock.setItem('db', 'old')
      await driver.writeFile('db', 'new')
      expect(localStorageMock.getItem('db')).toBe('new')
    })

    it('should remember the last content for backups', async () => {
      localStorageMock.setItem('db', 'stored')
      await driver.readFile('db')
      expect(driver.lastContent.db).toBe('stored')
      await driver.writeFile('db', 'written')
      expect(driver.lastContent.db).toBe('written')
    })
  })

  describe('WebDAV conflicts', () => {
    function webdavDriver() {
      const d = new FileSystemDriver({ type: 'webdav', name: 'dav', url: 'https://dav.example.com', username: 'u', password: 'p' })
      const server = { content: 'v1' }
      d.webdav = {
        getFileContents: async () => new TextEncoder().encode(server.content).buffer,
        putFileContents: async (_path, data) => { server.content = new TextDecoder().decode(data) },
      }
      return { d, server }
    }

    it('should compare the content before overwriting', async () => {
      const { d, server } = webdavDriver()
      await d.readFile('/db')
      server.content = 'theirs'
      await expect(d.writeFile('/db', 'mine')).rejects.toBeInstanceOf(ConflictError)
      expect(server.content).toBe('theirs')
    })

    it('should write when nothing changed', async () => {
      const { d, server } = webdavDriver()
      await d.readFile('/db')
      await d.writeFile('/db', 'mine')
      await d.writeFile('/db', 'mine 2')
      expect(server.content).toBe('mine 2')
    })

    it('should turn 401 into an AuthError', async () => {
      const { d } = webdavDriver()
      d.webdav.getFileContents = async () => { throw Object.assign(new Error('Unauthorized'), { response: { status: 401 } }) }
      await expect(d.readFile('/db')).rejects.toThrow('rejected the username or password')
    })
  })

  describe('describeAccessError', () => {
    const github = { type: 'github', name: 'gh', login: 'me', repo: 'vault' }

    it('should explain GitHub rate limits and missing permissions', () => {
      const rate = describeAccessError(Object.assign(new Error('API rate limit exceeded'), { status: 403 }), github)
      expect(rate.message).toMatch(/rate limit/)
      const denied = describeAccessError(Object.assign(new Error('Resource not accessible'), { status: 403 }), github)
      expect(denied.message).toMatch(/no access to "me\/vault"/)
    })

    it('should leave other errors unchanged', () => {
      const error = Object.assign(new Error('Server Error'), { status: 500 })
      expect(describeAccessError(error, github)).toBe(error)
    })
  })
})
