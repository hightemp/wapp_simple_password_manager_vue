import { describe, it, expect, beforeEach } from 'vitest'
import { FileSystemDriver } from '../../services/FileSystemDriver'
import { encrypt, decrypt } from '../../utils/crypto'
import CryptoJS from 'crypto-js'
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

    it('should write and read encrypted JSON (v2)', async () => {
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

    it('should handle migration: read v1, save as v2, read v2', async () => {
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

      // Save with new driver (writes v2 format)
      await driver.writeEncryptedJson('passwords-database', loaded, password)

      // Read again (should now read v2 format)
      const reloaded = await driver.readEncryptedJson('passwords-database', password)
      expect(reloaded).toEqual(payload)

      // Verify it's actually in v2 format now
      const stored = localStorageMock.getItem('passwords-database')
      const parsed = JSON.parse(stored)
      expect(parsed.v).toBe(2)
      expect(parsed.salt).toBeTruthy()
    })

    it('should reject on missing file for encrypted read', async () => {
      await expect(
        driver.readEncryptedJson('nonexistent', 'password')
      ).rejects.toBeTruthy()
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
})
