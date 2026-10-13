import { describe, it, expect } from 'vitest'
import { estimateStrength, MIN_SCORE } from '../../utils/passwordStrength'

const score = (password) => estimateStrength(password).score

describe('estimateStrength', () => {
  it.each([
    'password', 'Password1', 'qwerty123', '12345678', 'aaaaaaaaaaaa', 'letmein!', 'P@ssw0rd2024',
  ])('should rate the common password %s as very weak', (password) => {
    expect(score(password)).toBe(0)
  })

  it.each(['abc', 'test1234', 'Summer24', 'Summer2024', 'Michael1990!', 'abcdefghijkl'])('should rate %s below the minimum', (password) => {
    expect(score(password)).toBeLessThan(MIN_SCORE)
  })

  it.each([
    'correct horse battery staple',
    'k7#Vq2!mZp9@',
    'Tr0ub4dor&3xyzW',
    'плотник-ветер-сосна-42',
  ])('should accept %s', (password) => {
    expect(score(password)).toBeGreaterThanOrEqual(MIN_SCORE)
  })

  it('should rate a long random password as strong', () => {
    expect(estimateStrength('xK9$mQ2&vL7!pR4#wN8@').label).toBe('Strong')
  })

  it('should give hints for weak passwords only', () => {
    expect(estimateStrength('qwerty').hints.join(' ')).toMatch(/common/)
    expect(estimateStrength('short1A!').hints.join(' ')).toMatch(/at least 12/)
    expect(estimateStrength('xK9$mQ2&vL7!pR4#wN8@').hints).toEqual([])
  })

  it('should handle an empty password', () => {
    expect(estimateStrength('')).toMatchObject({ score: 0, bits: 0, hints: [] })
  })
})
