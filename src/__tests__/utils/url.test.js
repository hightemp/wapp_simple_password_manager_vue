import { describe, it, expect } from 'vitest'
import { openableUrl, siteDomain } from '../../utils/url'

describe('url', () => {
  it('openableUrl adds https:// and blocks script URLs', () => {
    expect(openableUrl('github.com/login')).toBe('https://github.com/login')
    expect(openableUrl(' http://example.com ')).toBe('http://example.com')
    expect(openableUrl('ftp://files.example.com')).toBe('ftp://files.example.com')
    expect(openableUrl('javascript:alert(1)')).toBe('')
    expect(openableUrl('DATA:text/html,x')).toBe('')
    expect(openableUrl('')).toBe('')
  })

  it('siteDomain returns public web domains only', () => {
    expect(siteDomain('https://Mail.Google.com/inbox')).toBe('mail.google.com')
    expect(siteDomain('github.com')).toBe('github.com')
    expect(siteDomain('http://localhost:8080')).toBeNull()
    expect(siteDomain('https://nas.local')).toBeNull()
    expect(siteDomain('https://router')).toBeNull()
    expect(siteDomain('192.168.1.1')).toBeNull()
    expect(siteDomain('https://[::1]/')).toBeNull()
    expect(siteDomain('ftp://files.example.com')).toBeNull()
    expect(siteDomain('not a url at all')).toBeNull()
    expect(siteDomain('')).toBeNull()
  })
})
