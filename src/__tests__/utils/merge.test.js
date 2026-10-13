import { describe, it, expect } from 'vitest'
import { mergeDatabases } from '../../utils/merge'

function db(data, { trash = [], categories = [], last_index } = {}) {
  return {
    table: {
      last_index: last_index ?? Math.max(0, ...data.map((e) => e.id), ...trash.map((t) => t.entry.id)),
      page: 1,
      selection_id: null,
      filter: {},
      data,
      trash,
      categories,
    },
  }
}

const clone = (value) => JSON.parse(JSON.stringify(value))
const byId = (database, id) => database.table.data.find((e) => e.id === id)

describe('mergeDatabases', () => {
  const base = db([
    { id: 1, name: 'Mail', login: 'me', password: 'p1' },
    { id: 2, name: 'Bank', login: 'acc', password: 'b1' },
  ])

  it('should keep changes made on both sides to different entries and fields', () => {
    const ours = clone(base)
    ours.table.data[0].password = 'p2'
    const theirs = clone(base)
    theirs.table.data[0].login = 'me@new'
    theirs.table.data[1].password = 'b2'

    const { database, stats } = mergeDatabases(base, ours, theirs, 100)
    expect(byId(database, 1)).toMatchObject({ login: 'me@new', password: 'p2' })
    expect(byId(database, 2).password).toBe('b2')
    expect(stats).toEqual({ added: 0, updated: 2, removed: 0, conflicts: 0 })
  })

  it('should keep ours on a conflict and put theirs into the history', () => {
    const ours = clone(base)
    ours.table.data[0].password = 'ours'
    const theirs = clone(base)
    theirs.table.data[0].password = 'theirs'

    const { database, stats } = mergeDatabases(base, ours, theirs, 100)
    const entry = byId(database, 1)
    expect(entry.password).toBe('ours')
    expect(entry.history.at(-1)).toEqual({ at: 100, fields: { password: 'theirs' } })
    expect(stats.conflicts).toBe(1)
  })

  it('should not count the same change on both sides as a conflict', () => {
    const ours = clone(base)
    ours.table.data[0].password = 'same'
    const theirs = clone(ours)
    const { database, stats } = mergeDatabases(base, ours, theirs)
    expect(byId(database, 1).password).toBe('same')
    expect(byId(database, 1).history).toBeUndefined()
    expect(stats).toEqual({ added: 0, updated: 0, removed: 0, conflicts: 0 })
  })

  it('should combine histories without duplicates', () => {
    const shared = { at: 1, fields: { password: 'p0' } }
    const ours = clone(base)
    ours.table.data[0].history = [shared, { at: 3, fields: { login: 'x' } }]
    const theirs = clone(base)
    theirs.table.data[0].history = [shared, { at: 2, fields: { name: 'y' } }]
    const { database } = mergeDatabases(base, ours, theirs)
    expect(byId(database, 1).history.map((v) => v.at)).toEqual([1, 2, 3])
  })

  it('should take entries added on their side', () => {
    const ours = clone(base)
    const theirs = clone(base)
    theirs.table.data.push({ id: 3, name: 'New there' })
    const { database, stats } = mergeDatabases(base, ours, theirs)
    expect(database.table.data.map((e) => e.id)).toEqual([1, 2, 3])
    expect(database.table.last_index).toBe(3)
    expect(stats.added).toBe(1)
  })

  it('should keep both entries when both sides created one with the same id', () => {
    const ours = clone(base)
    ours.table.data.push({ id: 3, name: 'Mine' })
    const theirs = clone(base)
    theirs.table.data.push({ id: 3, name: 'Theirs' })
    const { database } = mergeDatabases(base, ours, theirs)
    expect(database.table.data.map((e) => [e.id, e.name])).toEqual([[1, 'Mail'], [2, 'Bank'], [3, 'Mine'], [4, 'Theirs']])
    expect(database.table.last_index).toBe(4)
  })

  it('should treat identical new entries with the same id as one', () => {
    const ours = clone(base)
    ours.table.data.push({ id: 3, name: 'Same' })
    const theirs = clone(ours)
    const { database } = mergeDatabases(base, ours, theirs)
    expect(database.table.data).toHaveLength(3)
  })

  it('should follow a move to the trash made on one side', () => {
    const ours = clone(base)
    const theirs = clone(base)
    const [bank] = theirs.table.data.splice(1, 1)
    theirs.table.trash = [{ entry: bank, deleted_at: 50 }]
    const { database, stats } = mergeDatabases(base, ours, theirs)
    expect(database.table.data.map((e) => e.id)).toEqual([1])
    expect(database.table.trash).toEqual([{ entry: expect.objectContaining({ id: 2 }), deleted_at: 50 }])
    expect(stats.removed).toBe(1)
  })

  it('should keep an entry that was edited here and deleted for good there', () => {
    const ours = clone(base)
    ours.table.data[1].password = 'changed'
    const theirs = clone(base)
    theirs.table.data.splice(1, 1)
    const { database } = mergeDatabases(base, ours, theirs)
    expect(byId(database, 2).password).toBe('changed')
  })

  it('should drop an unchanged entry that was deleted for good there', () => {
    const ours = clone(base)
    const theirs = clone(base)
    theirs.table.data.splice(1, 1)
    const { database, stats } = mergeDatabases(base, ours, theirs)
    expect(byId(database, 2)).toBeUndefined()
    expect(stats.removed).toBe(1)
  })

  it('should not bring back an entry deleted for good here unless they changed it', () => {
    const ours = clone(base)
    ours.table.data.splice(1, 1)
    const unchanged = mergeDatabases(base, ours, clone(base)).database
    expect(byId(unchanged, 2)).toBeUndefined()

    const theirs = clone(base)
    theirs.table.data[1].password = 'changed there'
    expect(byId(mergeDatabases(base, ours, theirs).database, 2).password).toBe('changed there')
  })

  it('should merge explicit categories (removal on either side wins)', () => {
    const start = db([], { categories: ['A', 'B'] })
    const ours = db([], { categories: ['A', 'B', 'Mine'] })
    const theirs = db([], { categories: ['B', 'Theirs'] })
    const { database } = mergeDatabases(start, ours, theirs)
    expect(database.table.categories.sort()).toEqual(['B', 'Mine', 'Theirs'])
  })

  it('should treat every difference as a conflict without a base', () => {
    const ours = clone(base)
    ours.table.data[0].password = 'ours'
    const theirs = clone(base)
    theirs.table.data[0].password = 'theirs'
    theirs.table.data.push({ id: 5, name: 'Only there' })
    const { database } = mergeDatabases(null, ours, theirs, 7)
    expect(byId(database, 1).password).toBe('ours')
    expect(byId(database, 1).history).toEqual([{ at: 7, fields: { password: 'theirs' } }])
    expect(byId(database, 5).name).toBe('Only there')
  })
})
