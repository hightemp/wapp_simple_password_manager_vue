import { HISTORY_LIMIT, type Database, type Entry, type HistoryVersion, type TrashItem } from '@/stores/database'
import type { CustomField } from '@/types/entryTypes'

export interface MergeStats {
  // Entries taken from the other side (new there, or restored there)
  added: number
  // Entries with field values taken from the other side
  updated: number
  // Entries removed because they were deleted on the other side
  removed: number
  // Fields changed on both sides: ours is kept, theirs goes to the entry history
  conflicts: number
}

export interface MergeResult {
  database: Database
  stats: MergeStats
}

type Place = 'data' | 'trash'

interface Located {
  entry: Entry
  place: Place
  deletedAt?: number
}

function locate(database: Database | null): Map<number, Located> {
  const map = new Map<number, Located>()
  if (!database) return map
  for (const entry of database.table.data) map.set(entry.id!, { entry, place: 'data' })
  for (const item of database.table.trash ?? []) {
    map.set(item.entry.id!, { entry: item.entry, place: 'trash', deletedAt: item.deleted_at })
  }
  return map
}

/** Field names of an entry (without id and history) */
function fieldNames(...entries: (Entry | undefined)[]): string[] {
  const names = new Set<string>()
  for (const entry of entries) {
    for (const key of Object.keys(entry ?? {})) {
      if (key !== 'id' && key !== 'history' && key !== 'custom') names.add(key)
    }
  }
  return [...names]
}

function value(entry: Entry | undefined, field: string): string {
  return entry?.[field] ?? ''
}

function sameFields(a: Entry, b: Entry): boolean {
  return fieldNames(a, b).every((field) => value(a, field) === value(b, field))
}

function sameState(a: Located, b: Located): boolean {
  return a.place === b.place && sameFields(a.entry, b.entry)
}

/** Versions of both histories, without duplicates, oldest first */
function mergeHistory(a: HistoryVersion[] = [], b: HistoryVersion[] = []): HistoryVersion[] {
  const seen = new Set<string>()
  const result: HistoryVersion[] = []
  for (const version of [...a, ...b]) {
    const key = JSON.stringify([version.at, version.fields])
    if (seen.has(key)) continue
    seen.add(key)
    result.push(version)
  }
  return result.sort((x, y) => x.at - y.at)
}

/**
 * Custom field definitions: a field removed on either side is removed, new ones from
 * both sides are kept; a renamed field takes the side that changed it
 */
function mergeCustom(base: CustomField[] = [], ours: CustomField[] = [], theirs: CustomField[] = []): CustomField[] {
  const baseById = new Map(base.map((field) => [field.id, field]))
  const theirById = new Map(theirs.map((field) => [field.id, field]))
  const ourIds = new Set(ours.map((field) => field.id))
  const result: CustomField[] = []
  for (const field of ours) {
    const original = baseById.get(field.id)
    const other = theirById.get(field.id)
    if (original && !other) continue
    const changedHere = !original || JSON.stringify(field) !== JSON.stringify(original)
    result.push(changedHere || !other ? field : other)
  }
  for (const field of theirs) {
    if (!ourIds.has(field.id) && !baseById.has(field.id)) result.push(field)
  }
  return result
}

function withHistory(entry: Entry, history: HistoryVersion[]): Entry {
  const result = { ...entry }
  if (history.length) result.history = history.slice(-HISTORY_LIMIT)
  else delete result.history
  return result
}

/** Three-way merge of the categories explicitly created (a removal on either side wins) */
function mergeCategories(base: string[], ours: string[], theirs: string[]): string[] {
  const removed = new Set(base.filter((path) => !ours.includes(path) || !theirs.includes(path)))
  return [...new Set([...ours, ...theirs])].filter((path) => !removed.has(path))
}

/**
 * Three-way merge of the database edited here (`ours`) with the one saved elsewhere
 * (`theirs`), both derived from `base` (the version this session loaded or last saved;
 * null if unknown — then every difference counts as a conflict).
 *
 * Entries are matched by id. A field changed on one side takes that side's value;
 * a field changed differently on both sides keeps ours, and theirs is added to the
 * entry's history so nothing is lost. An entry deleted on one side and edited on the
 * other is kept. Two new entries that got the same id are both kept.
 */
export function mergeDatabases(base: Database | null, ours: Database, theirs: Database, now = Date.now()): MergeResult {
  const stats: MergeStats = { added: 0, updated: 0, removed: 0, conflicts: 0 }
  const baseMap = locate(base)
  const ourMap = locate(ours)
  const theirMap = locate(theirs)

  let lastIndex = Math.max(
    ours.table.last_index, theirs.table.last_index,
    ...ourMap.keys(), ...theirMap.keys(), 0,
  )
  const merged = new Map<number, Located>()
  // Their new entries whose id was taken by one of ours
  const renumbered: Located[] = []

  for (const [id, mine] of ourMap) {
    const other = theirMap.get(id)
    const original = baseMap.get(id)

    if (!other) {
      // Deleted for good on their side: keep it only if we changed it since
      if (original && sameState(mine, original)) {
        stats.removed++
      } else {
        merged.set(id, mine)
      }
      continue
    }

    if (base && !original && !sameFields(mine.entry, other.entry)) {
      // Both sides created a different entry with the same id (without a base the
      // same id is assumed to be the same entry)
      merged.set(id, mine)
      renumbered.push({ ...other, entry: { ...other.entry, id: ++lastIndex } })
      stats.added++
      continue
    }

    merged.set(id, mergeEntry(mine, other, original, now, stats))
  }

  for (const [id, other] of theirMap) {
    if (ourMap.has(id)) continue
    const original = baseMap.get(id)
    // Deleted for good here: bring it back only if they changed it since
    if (original && sameState(other, original)) continue
    merged.set(id, other)
    stats.added++
  }

  // Keep our order; entries new from their side follow in their order
  const order = [...ourMap.keys(), ...[...theirMap.keys()].filter((id) => !ourMap.has(id))]
  const located = [...order.filter((id) => merged.has(id)).map((id) => merged.get(id)!), ...renumbered]

  const data: Entry[] = []
  const trash: TrashItem[] = []
  for (const item of located) {
    if (item.place === 'data') data.push(item.entry)
    else trash.push({ entry: item.entry, deleted_at: item.deletedAt ?? now })
  }

  return {
    database: {
      table: {
        ...ours.table,
        last_index: lastIndex,
        data,
        trash,
        categories: mergeCategories(base?.table.categories ?? [], ours.table.categories ?? [], theirs.table.categories ?? []),
      },
    },
    stats,
  }
}

function mergeEntry(mine: Located, other: Located, original: Located | undefined, now: number, stats: MergeStats): Located {
  const entry: Entry = { id: mine.entry.id }
  const conflicting: Record<string, string> = {}
  let tookTheirs = false

  for (const field of fieldNames(mine.entry, other.entry, original?.entry)) {
    const ourValue = value(mine.entry, field)
    const theirValue = value(other.entry, field)
    const baseValue = original ? value(original.entry, field) : undefined
    if (ourValue === theirValue || theirValue === baseValue) {
      entry[field] = ourValue
    } else if (ourValue === baseValue) {
      entry[field] = theirValue
      tookTheirs = true
    } else {
      entry[field] = ourValue
      conflicting[field] = theirValue
    }
  }
  if (tookTheirs) stats.updated++

  const history = mergeHistory(mine.entry.history, other.entry.history)
  if (Object.keys(conflicting).length) {
    history.push({ at: now, fields: conflicting })
    stats.conflicts += Object.keys(conflicting).length
  }

  // Trash or not: a change on one side wins; if both moved it differently, keep it alive
  let place = mine.place
  let deletedAt = mine.deletedAt
  if (mine.place !== other.place) {
    if (original && mine.place === original.place) {
      place = other.place
      deletedAt = other.deletedAt
      if (place === 'trash') stats.removed++
      else stats.added++
    } else if (!original || other.place !== original.place) {
      place = 'data'
      deletedAt = undefined
    }
  }

  const custom = mergeCustom(original?.entry.custom, mine.entry.custom, other.entry.custom)
  if (custom.length) entry.custom = custom
  return { entry: withHistory(entry, history), place, deletedAt }
}
