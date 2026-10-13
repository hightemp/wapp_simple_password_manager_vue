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

  /** In-memory Drive with one file in appDataFolder; `version` grows with every write */
  function fakeDrive() {
    const drive = { content: null, version: 0, fileId: 'gd-file-1' }
    globalThis.fetch = vi.fn().mockImplementation((url, opts = {}) => {
      const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body), text: () => Promise.resolve(body) })
      if (url.includes('spaces=appDataFolder')) {
        return ok({ files: drive.content === null ? [] : [{ id: drive.fileId }] })
      }
      if (url.includes('alt=media')) return ok(drive.content)
      if (url.includes('fields=version') && !opts.method) return ok({ version: String(drive.version) })
      if (url.includes('uploadType=multipart') && opts.method === 'POST') {
        const parts = opts.body.split(/--[\w-]+/)
        drive.content = parts[2].replace(/^\r\nContent-Type:.*\r\n\r\n/, '').replace(/\r\n$/, '')
        drive.version = 1
        return ok({ id: drive.fileId, version: String(drive.version) })
      }
      if (url.includes('uploadType=media') && opts.method === 'PATCH') {
        drive.content = opts.body
        drive.version++
        return ok({ version: String(drive.version) })
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('') })
    })
    return drive
  }

  function gdriveDriver() {
    return new FileSystemDriver({
      type: 'googledrive',
      name: 'Test GDrive',
      gdrive_client_id: 'test-id.apps.googleusercontent.com',
    })
  }

  it('readFile should return the content and the file version', async () => {
    const drive = fakeDrive()
    drive.content = 'encrypted-content-here'
    drive.version = 4

    const result = await gdriveDriver().readFile('passwords-database')
    expect(result).toEqual({ data: 'encrypted-content-here', version: '4' })
  })

  it('writeFile should create file when it does not exist', async () => {
    const drive = fakeDrive()
    await gdriveDriver().writeFile('passwords-database', 'some-encrypted-data')
    const postCall = fetch.mock.calls.find(([, opts]) => opts?.method === 'POST')
    expect(postCall).toBeTruthy()
    expect(drive.content).toBe('some-encrypted-data')
  })

  it('writeFile should update file when it already exists', async () => {
    const drive = fakeDrive()
    drive.content = 'old'
    await gdriveDriver().writeFile('passwords-database', 'updated-data')
    const patchCall = fetch.mock.calls.find(([, opts]) => opts?.method === 'PATCH')
    expect(patchCall[1].body).toBe('updated-data')
    expect(drive.content).toBe('updated-data')
  })

  it('writeFile should fail with ConflictError when the file changed since it was read', async () => {
    const { ConflictError } = await import('../../services/FileSystemDriver')
    const drive = fakeDrive()
    drive.content = 'v1'
    const driver = gdriveDriver()
    await driver.readFile('passwords-database')

    // Another device writes
    drive.content = 'theirs'
    drive.version++

    await expect(driver.writeFile('passwords-database', 'mine')).rejects.toBeInstanceOf(ConflictError)
    expect(drive.content).toBe('theirs')

    // After reading again the write goes through
    await driver.readFile('passwords-database')
    await driver.writeFile('passwords-database', 'mine')
    expect(drive.content).toBe('mine')
    // …and the next write knows the version it produced
    await driver.writeFile('passwords-database', 'mine 2')
    expect(drive.content).toBe('mine 2')
  })

  it('writeFile should turn 403 into an AuthError', async () => {
    const { AuthError } = await import('../../services/FileSystemDriver')
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, text: () => Promise.resolve('') })
    await expect(gdriveDriver().writeFile('passwords-database', 'x')).rejects.toBeInstanceOf(AuthError)
  })

  it('readEncryptedJson + writeEncryptedJson should round-trip', async () => {
    const drive = fakeDrive()
    const driver = gdriveDriver()
    const password = 'test-master-pw'
    const data = { table: { data: [{ id: 1, name: 'Test', login: 'user' }] } }

    await driver.writeEncryptedJson('passwords-database', data, password)
    const parsed = JSON.parse(drive.content)
    expect(parsed.v).toBe(3)
    expect(parsed.salt).toBeTruthy()

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
