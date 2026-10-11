import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
const storage = {}
const localStorageMock = {
  getItem: (key) => storage[key] ?? null,
  setItem: (key, value) => { storage[key] = value },
  removeItem: (key) => { delete storage[key] },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]) },
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

    const mod = await import('../../services/FileSystemDriver')
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
    expect(driver.repo.type).toBe('googledrive')
    expect(driver.octokit).toBeNull()
    expect(driver.webdav).toBeNull()
  })

  it('readFile should route to googledrive handler', async () => {
    // Mock: findFile returns a file id, readFile returns content
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

    const result = await driver.readFile('passwords-database')
    expect(result.data).toBe('encrypted-content-here')
    expect(result.sha).toBe('gd-file-1') // fileId cached as SHA
  })

  it('writeFile should create file when it does not exist', async () => {
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

    await driver.writeFile('passwords-database', 'some-encrypted-data')
    // Should have called create (POST)
    const postCall = fetch.mock.calls.find(([, opts]) => opts?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(postCall[1].body).toContain('some-encrypted-data')
  })

  it('writeFile should update file when it already exists', async () => {
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

    await driver.writeFile('passwords-database', 'updated-data')
    const patchCall = fetch.mock.calls.find(([, opts]) => opts?.method === 'PATCH')
    expect(patchCall).toBeTruthy()
    expect(patchCall[1].body).toBe('updated-data')
  })

  it('readEncryptedJson + writeEncryptedJson should round-trip', async () => {
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
    await driver.writeEncryptedJson('passwords-database', data, password)
    expect(storedContent).toBeTruthy()

    // Verify it's actually encrypted (v3 format)
    const parsed = JSON.parse(storedContent)
    expect(parsed.v).toBe(3)
    expect(parsed.salt).toBeTruthy()

    // Read back decrypted
    const result = await driver.readEncryptedJson('passwords-database', password)
    expect(result).toEqual(data)
  })

  it('readFile should throw when file not found in appDataFolder', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ files: [] }),
    })

    const driver = new FileSystemDriver({
      type: 'googledrive',
      name: 'Test GDrive',
      gdrive_client_id: 'test-id.apps.googleusercontent.com',
    })

    await expect(driver.readFile('nonexistent')).rejects.toThrow('Not Found')
  })
})
