import { describe, it, expect } from 'vitest'
import { fnCapitalize, a, c, cc, fnRandomString, fnDebounce } from '../lib'

describe('lib.js utilities', () => {
  describe('fnCapitalize', () => {
    it('should capitalize the first letter', () => {
      expect(fnCapitalize('hello')).toBe('Hello')
      expect(fnCapitalize('world')).toBe('World')
    })

    it('should handle single character', () => {
      expect(fnCapitalize('a')).toBe('A')
    })

    it('should handle already capitalized', () => {
      expect(fnCapitalize('Hello')).toBe('Hello')
    })
  })

  describe('a (tagged template to array)', () => {
    it('should split space-separated string into array', () => {
      expect(a`foo bar baz`).toEqual(['foo', 'bar', 'baz'])
    })

    it('should handle single item', () => {
      expect(a`single`).toEqual(['single'])
    })
  })

  describe('fnRandomString', () => {
    it('should return a string', () => {
      expect(typeof fnRandomString()).toBe('string')
    })

    it('should return non-empty string', () => {
      expect(fnRandomString().length).toBeGreaterThan(0)
    })

    it('should return different strings', () => {
      const s1 = fnRandomString()
      const s2 = fnRandomString()
      // Very unlikely to be the same
      expect(s1).not.toBe(s2)
    })
  })

  describe('fnDebounce', () => {
    it('should delay function execution', async () => {
      let iCount = 0
      const fnDeb = fnDebounce(() => { iCount++ }, 50)

      fnDeb()
      fnDeb()
      fnDeb()

      expect(iCount).toBe(0)

      await new Promise(r => setTimeout(r, 100))
      expect(iCount).toBe(1)
    })

    it('should only call once after burst', async () => {
      let iCount = 0
      const fnDeb = fnDebounce(() => { iCount++ }, 50)

      for (let i = 0; i < 10; i++) {
        fnDeb()
      }

      await new Promise(r => setTimeout(r, 100))
      expect(iCount).toBe(1)
    })

    it('should pass arguments to the function', async () => {
      let sResult = ''
      const fnDeb = fnDebounce((sVal) => { sResult = sVal }, 50)

      fnDeb('hello')

      await new Promise(r => setTimeout(r, 100))
      expect(sResult).toBe('hello')
    })
  })
})
