import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fnEncrypt, fnDecrypt } from '../crypto'

// Mock google.accounts.oauth2 for FileSystemDriver googledrive init
let mockTokenCallback = null

function setupGoogleMock() {
  globalThis.google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn((config) => {
          mockTokenCallback = config.callback
          return {
            requestAccessToken: vi.fn(() => {
              setTimeout(() => mockTokenCallback({
                access_token: 'ya29.test-token',
                expires_in: 3600,
                token_type: 'Bearer',
                scope: 'https://www.googleapis.com/auth/drive.appdata',
              }), 0)
            }),
          }
        }),
      },
    },
  }
}

// Mock localStorage
const oStorage = {}
const localStorageMock = {
  getItem: (key) => oStorage[key] ?? null,
  setItem: (key, value) => { oStorage[key] = value },
  removeItem: (key) => { delete oStorage[key] },
  clear: () => { Object.keys(oStorage).forEach(k => delete oStorage[k]) },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('FileSystemDriver — googledrive type', () => {
  let FileSystemDriver

  beforeEach(async () => {
    vi.resetModules()
    localStorageMock.clear()
    setupGoogleMock()

    // Mock fetch before importing FileSystemDriver
    globalThis.fetch = vi.fn()

    const mod = await import('../FileSystemDriver')
    FileSystemDriver = mod.FileSystemDriver
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete globalThis.google
    delete globalThis.fetch
    mockTokenCallback = null
  })

  it('should create a googledrive driver without errors', () => {
    const driver = new FileSystemDriver({
      type: 'googledrive',
      name: 'My Google Drive',
      gdrive_client_id: 'test-id.apps.googleusercontent.com',
    })
    expect(driver.oRepoItem.type).toBe('googledrive')
    expect(driver.octokit).toBeNull()
    expect(driver.webdav).toBeNull()
  })

  it('fnReadFile should route to googledrive handler', async () => {
    // Mock: findFile returns a file id, readFile returns content
    let callIdx = 0
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('spaces=appDataFolder')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: [{ id: 'gd-file-1' }] }),
        })
      }
      if (url.includes('alt=media')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('encrypted-content-here'),
        })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('not found') })
    })

    const driver = new FileSystemDriver({
      type: 'googledrive',
      name: 'Test GDrive',
      gdrive_client_id: 'test-id.apps.googleusercontent.com',
    })

    const result = await driver.fnReadFile('passwords-database')
    expect(result.sData).toBe('encrypted-content-here')
    expect(result.sSHA).toBe('gd-file-1') // fileId cached as SHA
  })

  it('fnWriteFile should create file when it does not exist', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('spaces=appDataFolder')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: [] }), // no existing file
        })
      }
      if (url.includes('uploadType=multipart') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'new-file-id' }),
        })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })
    })

    const driver = new FileSystemDriver({
      type: 'googledrive',
      name: 'Test GDrive',
      gdrive_client_id: 'test-id.apps.googleusercontent.com',
    })

    await driver.fnWriteFile('passwords-database', 'some-encrypted-data')
    // Should have called create (POST)
    const postCall = fetch.mock.calls.find(([url, opts]) => opts?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(postCall[1].body).toContain('some-encrypted-data')
  })

  it('fnWriteFile should update file when it already exists', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('spaces=appDataFolder')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: [{ id: 'existing-file' }] }),
        })
      }
      if (url.includes('uploadType=media') && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: true })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })
    })

    const driver = new FileSystemDriver({
      type: 'googledrive',
      name: 'Test GDrive',
      gdrive_client_id: 'test-id.apps.googleusercontent.com',
    })

    await driver.fnWriteFile('passwords-database', 'updated-data')
    const patchCall = fetch.mock.calls.find(([url, opts]) => opts?.method === 'PATCH')
    expect(patchCall).toBeTruthy()
    expect(patchCall[1].body).toBe('updated-data')
  })

  it('fnReadFileCryptoJSON + fnWriteFileCryptoJSON should round-trip', async () => {
    // In-memory storage for the "Google Drive file"
    let storedContent = null

    globalThis.fetch = vi.fn().mockImplementation((url, opts) => {
      if (url.includes('spaces=appDataFolder')) {
        if (storedContent !== null) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ files: [{ id: 'crypto-file' }] }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: [] }),
        })
      }
      if (url.includes('alt=media')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(storedContent),
        })
      }
      if (url.includes('uploadType=multipart') && opts?.method === 'POST') {
        // Extract content from multipart body
        const parts = opts.body.split(/--[\w-]+/)
        const contentPart = parts[2] // third part has actual content
        storedContent = contentPart.replace(/Content-Type:.*\r\n\r\n/, '').replace(/\r\n$/, '')
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'crypto-file' }),
        })
      }
      if (url.includes('uploadType=media') && opts?.method === 'PATCH') {
        storedContent = opts.body
        return Promise.resolve({ ok: true })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })
    })

    const driver = new FileSystemDriver({
      type: 'googledrive',
      name: 'Test GDrive',
      gdrive_client_id: 'test-id.apps.googleusercontent.com',
    })

    const password = 'test-master-pw'
    const data = { table: { data: [{ id: 1, name: 'Test', login: 'user' }] } }

    // Write encrypted
    await driver.fnWriteFileCryptoJSON('passwords-database', data, password)
    expect(storedContent).toBeTruthy()

    // Verify it's actually encrypted (v2 format)
    const parsed = JSON.parse(storedContent)
    expect(parsed.v).toBe(2)
    expect(parsed.salt).toBeTruthy()

    // Read back decrypted
    const result = await driver.fnReadFileCryptoJSON('passwords-database', password)
    expect(result).toEqual(data)
  })

  it('fnReadFile should throw when file not found in appDataFolder', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ files: [] }),
    })

    const driver = new FileSystemDriver({
      type: 'googledrive',
      name: 'Test GDrive',
      gdrive_client_id: 'test-id.apps.googleusercontent.com',
    })

    await expect(driver.fnReadFile('nonexistent')).rejects.toThrow('Not Found')
  })
})
