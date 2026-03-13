import { describe, it, expect, beforeEach } from 'vitest'
import { FileSystemDriver } from '../FileSystemDriver'
import { fnEncrypt, fnDecrypt } from '../crypto'
import CryptoJS from 'crypto-js'
import DES from 'crypto-js/tripledes.js'

// Mock localStorage
const oStorage = {}
const localStorageMock = {
  getItem: (key) => oStorage[key] ?? null,
  setItem: (key, value) => { oStorage[key] = value },
  removeItem: (key) => { delete oStorage[key] },
  clear: () => { Object.keys(oStorage).forEach(k => delete oStorage[k]) },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('FileSystemDriver', () => {
  let oDriver

  beforeEach(() => {
    localStorageMock.clear()
    oDriver = new FileSystemDriver({ type: 'localstorage', name: 'test' })
  })

  describe('localStorage operations', () => {
    it('should write and read a file', async () => {
      await oDriver.fnWriteFile('test-file', 'hello world')
      const { sData } = await oDriver.fnReadFile('test-file')
      expect(sData).toBe('hello world')
    })

    it('should write and read JSON', async () => {
      const oData = { name: 'test', value: 42 }
      await oDriver.fnWriteFileJSON('test.json', oData)
      const oResult = await oDriver.fnReadFileJSON('test.json')
      expect(oResult).toEqual(oData)
    })

    it('should write and read encrypted JSON (v2)', async () => {
      const sPassword = 'my-secret'
      const oData = { table: { data: [{ id: 1, name: 'entry' }] } }

      await oDriver.fnWriteFileCryptoJSON('encrypted.dat', oData, sPassword)
      const oResult = await oDriver.fnReadFileCryptoJSON('encrypted.dat', sPassword)

      expect(oResult).toEqual(oData)
    })

    it('should read legacy 3DES encrypted files (backward compat)', async () => {
      const sPassword = 'old-password'
      const oData = { table: { data: [{ id: 1, name: 'legacy-entry' }] } }

      // Simulate old app writing data with 3DES directly
      const sLegacyEncrypted = DES.encrypt(JSON.stringify(oData, null, 4), sPassword).toString()
      localStorageMock.setItem('legacy-db', sLegacyEncrypted)

      // New driver should read it correctly
      const oResult = await oDriver.fnReadFileCryptoJSON('legacy-db', sPassword)
      expect(oResult).toEqual(oData)
    })

    it('should handle migration: read v1, save as v2, read v2', async () => {
      const sPassword = 'migrate-me'
      const oData = {
        table: {
          last_index: 3,
          data: [
            { id: 1, category: 'email', name: 'Gmail', login: 'user@gmail.com', password: 'p@ss1' },
            { id: 2, category: 'social', name: 'Twitter', login: 'user', password: 'p@ss2' },
          ],
        },
      }

      // Write with old 3DES format
      const sLegacy = DES.encrypt(JSON.stringify(oData, null, 4), sPassword).toString()
      localStorageMock.setItem('passwords-database', sLegacy)

      // Read with new driver (should auto-detect v1)
      const oLoaded = await oDriver.fnReadFileCryptoJSON('passwords-database', sPassword)
      expect(oLoaded).toEqual(oData)

      // Save with new driver (writes v2 format)
      await oDriver.fnWriteFileCryptoJSON('passwords-database', oLoaded, sPassword)

      // Read again (should now read v2 format)
      const oReloaded = await oDriver.fnReadFileCryptoJSON('passwords-database', sPassword)
      expect(oReloaded).toEqual(oData)

      // Verify it's actually in v2 format now
      const sStored = localStorageMock.getItem('passwords-database')
      const oParsed = JSON.parse(sStored)
      expect(oParsed.v).toBe(2)
      expect(oParsed.salt).toBeTruthy()
    })

    it('should reject on missing file for encrypted read', async () => {
      await expect(
        oDriver.fnReadFileCryptoJSON('nonexistent', 'password')
      ).rejects.toBeTruthy()
    })
  })

  describe('initialization', () => {
    it('should create localstorage driver', () => {
      const d = new FileSystemDriver({ type: 'localstorage', name: 'test' })
      expect(d.oRepoItem.type).toBe('localstorage')
      expect(d.octokit).toBeNull()
      expect(d.webdav).toBeNull()
    })

    it('should set repo item', () => {
      const oRepo = { type: 'localstorage', name: 'my-storage' }
      const d = new FileSystemDriver(oRepo)
      expect(d.oRepoItem).toBe(oRepo)
    })
  })
})
