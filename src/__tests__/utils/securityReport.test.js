import { describe, it, expect } from 'vitest'
import { buildReport, passwordChangedAt, withPassword, formatAge, OLD_PASSWORD_DAYS } from '../../utils/securityReport'

const DAY = 24 * 60 * 60 * 1000
const NOW = 1000 * DAY

describe('securityReport', () => {
  it('withPassword keeps entries of types with a password field', () => {
    const entries = [
      { id: 1, password: 'a' },
      { id: 2, type: 'server', password: 'b' },
      { id: 3, type: 'card', pin: '1234', password: 'stale' },
      { id: 4, password: '' },
    ]
    expect(withPassword(entries).map((entry) => entry.id)).toEqual([1, 2])
  })

  it('passwordChangedAt uses the recorded date, then the history', () => {
    expect(passwordChangedAt({ password_changed_at: 5, history: [{ at: 9, fields: { password: 'x' } }] })).toBe(5)
    expect(passwordChangedAt({ history: [{ at: 3, fields: { password: 'x' } }, { at: 7, fields: { login: 'y' } }] })).toBe(3)
    expect(passwordChangedAt({ history: [{ at: 7, fields: { login: 'y' } }] })).toBeNull()
    expect(passwordChangedAt({})).toBeNull()
  })

  it('buildReport finds weak, reused and old passwords', () => {
    const strong = 'Vq8#mZ2!pL9$wR4x'
    const report = buildReport([
      { id: 1, name: 'A', password: '123456', password_changed_at: NOW },
      { id: 2, name: 'B', password: strong, password_changed_at: NOW - (OLD_PASSWORD_DAYS + 1) * DAY },
      { id: 3, name: 'C', password: strong, password_changed_at: NOW - 10 * DAY },
      { id: 4, name: 'D', password: 'Zt5^kN8&qW2@hJ7m' },
      { id: 5, name: 'E', password: 'Yt5^kN8&qW2@hJ7z', password_changed_at: NOW - 900 * DAY },
    ], NOW)

    expect(report.checked).toHaveLength(5)
    expect(report.weak.map((item) => item.entry.id)).toEqual([1])
    expect(report.reused.map((group) => group.map((item) => item.entry.id))).toEqual([[2, 3]])
    // Oldest first
    expect(report.old.map((item) => item.entry.id)).toEqual([5, 2])
    expect(report.unknownAge).toBe(1)
  })

  it('formatAge rounds to days, months or years', () => {
    expect(formatAge(NOW - DAY, NOW)).toBe('1 day')
    expect(formatAge(NOW - 90 * DAY, NOW)).toBe('3 months')
    expect(formatAge(NOW - 800 * DAY, NOW)).toBe('2 years')
  })
})
