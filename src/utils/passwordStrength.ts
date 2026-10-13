/**
 * Rough master password strength estimate — no dictionary library, so it errs on the
 * side of caution: entropy of the character classes used, reduced for repeated and
 * sequential characters, and zero for well-known passwords.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4

export interface Strength {
  score: StrengthScore
  label: string
  // Estimated entropy in bits
  bits: number
  // What would make the password stronger (empty when it is fine)
  hints: string[]
}

// Below this score the password is reported as weak
export const MIN_SCORE: StrengthScore = 2

const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']

// Bits needed for each score above 0
const THRESHOLDS = [28, 40, 60, 80]

// Most common passwords and patterns (lowercase, digits/years stripped from the end)
const COMMON = new Set([
  'password', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'qwerty', 'qwertyuiop', 'asdfgh', 'asdfghjkl', 'zxcvbnm',
  'letmein', 'welcome', 'admin', 'administrator', 'root', 'login', 'master', 'secret', 'iloveyou', 'monkey',
  'dragon', 'football', 'baseball', 'superman', 'batman', 'trustno1', 'sunshine', 'princess', 'shadow',
  'michael', 'jennifer', 'charlie', 'jordan', 'hunter', 'freedom', 'whatever', 'starwars', 'pokemon',
  'computer', 'internet', 'samsung', 'google', 'apple', 'abc', 'abcdef', 'test', 'guest', 'changeme',
  'default', 'hello', 'love', 'pass', 'master password', 'masterpassword', 'qazwsx', '1q2w3e4r', '1qaz2wsx',
  'zaq12wsx', 'parol', 'privet', 'qwe', 'asd', 'zxc', 'user', 'demo',
])

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', 'йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю']

function charsetSize(password: string): number {
  let size = 0
  if (/[a-z]/.test(password)) size += 26
  if (/[A-Z]/.test(password)) size += 26
  if (/[0-9]/.test(password)) size += 10
  if (/[^a-zA-Z0-9\s\p{L}]/u.test(password)) size += 33
  if (/\s/.test(password)) size += 1
  // Letters outside A–Z (Cyrillic, accents, …)
  if (/[^a-zA-Z\P{L}]/u.test(password)) size += 40
  return size
}

/** Characters that only continue a run (aaa, abc, 321, qwer) add little */
function predictableCount(password: string): number {
  const lower = password.toLowerCase()
  let count = 0
  for (let i = 1; i < lower.length; i++) {
    const step = lower.charCodeAt(i) - lower.charCodeAt(i - 1)
    const onKeyboardRow = KEYBOARD_ROWS.some((row) => row.includes(lower[i - 1] + lower[i]))
    if (step === 0 || step === 1 || step === -1 || onKeyboardRow) count++
  }
  return count
}

/** "Summer2024", "Michael1990!" — a word followed by a number is among the first guesses */
function isWordAndNumber(password: string): boolean {
  return /^[\p{L}]{1,10}[\d]{1,4}[!@#$%^&*.?]?$/u.test(password)
}

function isCommon(password: string): boolean {
  const lower = password.toLowerCase()
  const stem = lower.replace(/[\d!@#$%^&*._-]+$/, '').replace(/^[\d!@#$%^&*._-]+/, '')
  return COMMON.has(lower) || COMMON.has(stem) || /^\d+$/.test(lower) || /^(.)\1*$/.test(lower)
}

export function estimateStrength(password: string): Strength {
  if (!password) return { score: 0, label: LABELS[0], bits: 0, hints: [] }

  const length = [...password].length
  const effectiveLength = Math.max(1, length - predictableCount(password) * 0.75)
  const bits = isCommon(password) ? 0 : Math.round(effectiveLength * Math.log2(Math.max(charsetSize(password), 2)))
  let score = THRESHOLDS.filter((threshold) => bits >= threshold).length as StrengthScore
  if (isWordAndNumber(password)) score = Math.min(score, 1) as StrengthScore

  const hints: string[] = []
  if (score < 4) {
    if (isCommon(password)) hints.push('This is a very common password — choose something else')
    else if (isWordAndNumber(password)) hints.push('A word followed by a number is easy to guess')
    if (length < 12) hints.push('Use at least 12 characters — a few random words work well')
    else if (charsetSize(password) <= 36 && score < 3) hints.push('Make it longer, or mix in capitals, digits or symbols')
    if (predictableCount(password) >= 3) hints.push('Avoid repeated characters and sequences like "abc", "123" or "qwerty"')
  }

  return { score, label: LABELS[score], bits, hints }
}
