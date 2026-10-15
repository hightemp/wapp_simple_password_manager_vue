import { describe, it, expect, vi, afterEach } from 'vitest'
import { sha1Hex, parseRange, checkPasswords } from '../../services/breaches'

// SHA-1 of "password"
const PASSWORD_HASH = '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8'

afterEach(() => vi.unstubAllGlobals())

describe('breaches', () => {
  it('sha1Hex gives the upper-case hex digest', async () => {
    expect(await sha1Hex('password')).toBe(PASSWORD_HASH)
  })

  it('parseRange reads counts and skips padding lines', () => {
    const counts = parseRange('1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\nAAAA:0\r\nbbbb:2\n\n')
    expect(counts.get('1E4C9B93F3F0682250B6CF8331B7EE68FD8')).toBe(3861493)
    expect(counts.has('AAAA')).toBe(false)
    expect(counts.get('BBBB')).toBe(2)
  })

  it('checkPasswords sends only hash prefixes, once per prefix', async () => {
    const fetchMock = vi.fn(async (url) => ({
      ok: true,
      text: async () => (url.endsWith('5BAA6') ? '1E4C9B93F3F0682250B6CF8331B7EE68FD8:10\nFFFF:0' : ''),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const progress = []
    const result = await checkPasswords(['password', 'password', 'x7!Qm#long-unique', ''], {
      onProgress: (done, total) => progress.push([done, total]),
    })

    expect(result.get('password')).toBe(10)
    expect(result.get('x7!Qm#long-unique')).toBe(0)
    expect(result.has('')).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toMatch(/^https:\/\/api\.pwnedpasswords\.com\/range\/[0-9A-F]{5}$/)
      expect(options.headers['Add-Padding']).toBe('true')
    }
    // Only the 5-character prefix leaves, never the password or the full hash
    expect(fetchMock.mock.calls.map(([url]) => url.split('/range/')[1])).toEqual(['5BAA6', expect.any(String)])
    expect(progress.at(-1)).toEqual([2, 2])
  })

  it('checkPasswords reports service errors and network failures', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503 })))
    await expect(checkPasswords(['a'])).rejects.toThrow('(503)')
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    await expect(checkPasswords(['a'])).rejects.toThrow('Could not reach')
  })
})
