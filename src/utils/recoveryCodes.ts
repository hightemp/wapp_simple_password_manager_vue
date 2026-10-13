/**
 * Recovery codes are stored one per line; a used code is marked with USED_MARK
 * in front of it, so the list stays a plain text field.
 */

export const USED_MARK = '✓ '

export interface RecoveryCode {
  code: string
  used: boolean
  // Line number in the stored text
  line: number
}

export function parseCodes(text: string): RecoveryCode[] {
  return (text ?? '').split('\n')
    .map((raw, line) => {
      const trimmed = raw.trim()
      const used = trimmed.startsWith(USED_MARK.trim())
      return { code: used ? trimmed.slice(USED_MARK.trim().length).trim() : trimmed, used, line }
    })
    .filter((item) => item.code)
}

/** Text with the code on `line` marked as used / unused */
export function toggleUsed(text: string, line: number): string {
  const lines = (text ?? '').split('\n')
  const raw = lines[line]?.trim()
  if (!raw) return text
  const mark = USED_MARK.trim()
  lines[line] = raw.startsWith(mark) ? raw.slice(mark.length).trim() : USED_MARK + raw
  return lines.join('\n')
}

export function countUnused(text: string): { unused: number; total: number } {
  const codes = parseCodes(text)
  return { unused: codes.filter((code) => !code.used).length, total: codes.length }
}
