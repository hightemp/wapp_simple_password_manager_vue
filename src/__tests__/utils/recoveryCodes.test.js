import { describe, it, expect } from 'vitest'
import { parseCodes, toggleUsed, countUnused } from '../../utils/recoveryCodes'

describe('recovery codes', () => {
  const text = 'aaaa-1111\n\n✓ bbbb-2222\n  cccc-3333  '

  it('should parse codes and used marks, skipping empty lines', () => {
    expect(parseCodes(text)).toEqual([
      { code: 'aaaa-1111', used: false, line: 0 },
      { code: 'bbbb-2222', used: true, line: 2 },
      { code: 'cccc-3333', used: false, line: 3 },
    ])
    expect(countUnused(text)).toEqual({ unused: 2, total: 3 })
  })

  it('should toggle the used mark of one line', () => {
    const marked = toggleUsed(text, 0)
    expect(marked.split('\n')[0]).toBe('✓ aaaa-1111')
    expect(toggleUsed(marked, 0).split('\n')[0]).toBe('aaaa-1111')
    expect(toggleUsed(text, 1)).toBe(text)
  })
})
