import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We'll import the module after creating it — for now define the expected API shape
// and mock the global dependencies (fetch, google.accounts.oauth2)

// === Mock google.accounts.oauth2 ===
let mockTokenCallback = null
let mockErrorCallback = null
let mockRequestAccessTokenOpts = null

const mockTokenClient = {
  requestAccessToken: vi.fn((opts) => {
    mockRequestAccessTokenOpts = opts
    // Simulate async callback — invoke on next tick
    if (mockTokenCallback) {
      setTimeout(() => mockTokenCallback({
        access_token: 'ya29.mock-token-12345',
        expires_in: 3600,
        token_type: 'Bearer',
        scope: 'https://www.googleapis.com/auth/drive.appdata',
      }), 0)
    }
  }),
}

function setupGoogleMock() {
  globalThis.google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn((config) => {
          mockTokenCallback = config.callback
          mockErrorCallback = config.error_callback
          return mockTokenClient
        }),
      },
    },
  }
}

function cleanupGoogleMock() {
  delete globalThis.google
  mockTokenCallback = null
  mockErrorCallback = null
  mockRequestAccessTokenOpts = null
}

// === Test suite ===
describe('GoogleDriveClient', () => {
  let gd

  beforeEach(async () => {
    vi.resetModules()
    cleanupGoogleMock()
    setupGoogleMock()
    // Dynamic import so each test gets a fresh module
    gd = await import('../GoogleDriveClient')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanupGoogleMock()
  })

  describe('loadGisScript', () => {
    it('should resolve immediately when google global exists', async () => {
      // google is already set up by setupGoogleMock
      await expect(gd.loadGisScript()).resolves.toBeUndefined()
    })
  })

  describe('requestToken', () => {
    it('should return access_token from GIS callback', async () => {
      const token = await gd.requestToken('test-client-id.apps.googleusercontent.com')
      expect(token).toBe('ya29.mock-token-12345')
      expect(google.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(
        expect.objectContaining({
          client_id: 'test-client-id.apps.googleusercontent.com',
          scope: 'https://www.googleapis.com/auth/drive.appdata',
        })
      )
    })

    it('should reject when GIS returns error', async () => {
      // Override initTokenClient to return error in callback
      google.accounts.oauth2.initTokenClient = vi.fn((config) => ({
        requestAccessToken: vi.fn(() => {
          setTimeout(() => config.callback({
            error: 'access_denied',
            error_description: 'User denied',
          }), 0)
        }),
      }))

      await expect(gd.requestToken('client-id')).rejects.toThrow('User denied')
    })
  })

  describe('ensureToken', () => {
    it('should return cached token if not expired', async () => {
      // First call gets a fresh token
      const token1 = await gd.requestToken('client-id')
      // ensureToken should reuse it
      const token2 = await gd.ensureToken('client-id')
      expect(token2).toBe(token1)
    })
  })

  describe('findFile', () => {
    it('should return fileId when file exists', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files: [{ id: 'file-123' }] }),
      })

      const id = await gd.findFile('mock-token', 'passwords-database')
      expect(id).toBe('file-123')
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('spaces=appDataFolder'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        })
      )
    })

    it('should return null when file does not exist', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ files: [] }),
      })

      const id = await gd.findFile('mock-token', 'passwords-database')
      expect(id).toBeNull()
    })

    it('should throw on API error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      await expect(gd.findFile('mock-token', 'test')).rejects.toThrow('Drive list: 500')
    })
  })

  describe('readFile', () => {
    it('should return file content as text', async () => {
      const encrypted = '{"v":2,"salt":"abc","iv":"def","data":"encrypted-data"}'
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(encrypted),
      })

      const content = await gd.readFile('mock-token', 'file-123')
      expect(content).toBe(encrypted)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('file-123'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer mock-token' },
        })
      )
    })

    it('should throw on 404', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      })

      await expect(gd.readFile('mock-token', 'bad-id')).rejects.toThrow('Drive read: 404')
    })
  })

  describe('createFile', () => {
    it('should POST multipart/related and return new fileId', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'new-file-456' }),
      })

      const id = await gd.createFile('mock-token', 'passwords-database', '{"encrypted":"data"}')
      expect(id).toBe('new-file-456')

      const [url, opts] = fetch.mock.calls[0]
      expect(url).toContain('uploadType=multipart')
      expect(opts.method).toBe('POST')
      expect(opts.headers['Content-Type']).toContain('multipart/related')
      expect(opts.headers.Authorization).toBe('Bearer mock-token')
      // Body should contain metadata with parents and content
      expect(opts.body).toContain('"parents":["appDataFolder"]')
      expect(opts.body).toContain('"name":"passwords-database"')
      expect(opts.body).toContain('{"encrypted":"data"}')
    })

    it('should throw on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Forbidden'),
      })

      await expect(gd.createFile('mock-token', 'test', 'x')).rejects.toThrow('Drive create: 403')
    })
  })

  describe('updateFile', () => {
    it('should PATCH with media upload', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

      await gd.updateFile('mock-token', 'file-123', '{"updated":"data"}')

      const [url, opts] = fetch.mock.calls[0]
      expect(url).toContain('file-123')
      expect(url).toContain('uploadType=media')
      expect(opts.method).toBe('PATCH')
      expect(opts.headers.Authorization).toBe('Bearer mock-token')
      expect(opts.body).toBe('{"updated":"data"}')
    })

    it('should throw on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
      })

      await expect(gd.updateFile('mock-token', 'id', 'x')).rejects.toThrow('Drive update: 500')
    })
  })

  describe('401 retry', () => {
    it('findFile should retry after 401 with new token', async () => {
      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            text: () => Promise.resolve('Unauthorized'),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ files: [{ id: 'file-retry' }] }),
        })
      })

      // First need a token
      await gd.requestToken('client-id')
      const id = await gd.findFile('ya29.mock-token-12345', 'test', 'client-id')
      expect(id).toBe('file-retry')
      expect(callCount).toBe(2)
    })
  })
})
