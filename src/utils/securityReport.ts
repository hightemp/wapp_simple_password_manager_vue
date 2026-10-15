import type { Entry } from '@/stores/database'
import { entryType, PASSWORD_CHANGED_KEY } from '@/types/entryTypes'
import { estimateStrength, MIN_SCORE, type Strength } from '@/utils/passwordStrength'

// Passwords not changed for longer than this are reported as old
export const OLD_PASSWORD_DAYS = 365
const DAY = 24 * 60 * 60 * 1000

export interface ReportEntry {
  entry: Entry
  strength: Strength
  // When the password was set; null when unknown (entries saved before it was recorded)
  changedAt: number | null
}

export interface SecurityReport {
  // Entries with a password
  checked: ReportEntry[]
  weak: ReportEntry[]
  // Groups of entries sharing a password
  reused: ReportEntry[][]
  old: ReportEntry[]
  // Entries whose password age is not known
  unknownAge: number
}

/** Entries of a type with a password field that have one */
export function withPassword(entries: Entry[]): Entry[] {
  return entries.filter((entry) => entry.password && entryType(entry).fields.some((field) => field.key === 'password'))
}

/** When the password was set: the recorded time, else the last password change in the history */
export function passwordChangedAt(entry: Entry): number | null {
  if (Number.isFinite(entry[PASSWORD_CHANGED_KEY])) return entry[PASSWORD_CHANGED_KEY]!
  const change = [...(entry.history ?? [])].reverse().find((version) => 'password' in version.fields)
  return change?.at ?? null
}

export function buildReport(entries: Entry[], now = Date.now()): SecurityReport {
  const checked: ReportEntry[] = withPassword(entries).map((entry) => ({
    entry,
    strength: estimateStrength(entry.password),
    changedAt: passwordChangedAt(entry),
  }))

  const byPassword = new Map<string, ReportEntry[]>()
  for (const item of checked) {
    byPassword.set(item.entry.password, [...(byPassword.get(item.entry.password) ?? []), item])
  }

  return {
    checked,
    weak: checked.filter((item) => item.strength.score < MIN_SCORE),
    reused: [...byPassword.values()].filter((group) => group.length > 1).sort((a, b) => b.length - a.length),
    old: checked
      .filter((item) => item.changedAt !== null && now - item.changedAt > OLD_PASSWORD_DAYS * DAY)
      .sort((a, b) => a.changedAt! - b.changedAt!),
    unknownAge: checked.filter((item) => item.changedAt === null).length,
  }
}

/** "3 years", "14 months", "5 days" */
export function formatAge(since: number, now = Date.now()): string {
  const days = Math.floor((now - since) / DAY)
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
  if (days >= 730) return plural(Math.floor(days / 365), 'year')
  if (days >= 60) return plural(Math.floor(days / 30), 'month')
  return plural(days, 'day')
}
