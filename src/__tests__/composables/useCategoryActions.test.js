import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDatabaseStore, normalizeDatabase } from '../../stores/database'
import { useCategoryState } from '../../composables/useCategoryState'
import { useCategoryActions } from '../../composables/useCategoryActions'

describe('useCategoryActions', () => {
  let db, state, notify, confirm, actions

  beforeEach(() => {
    setActivePinia(createPinia())
    db = useDatabaseStore()
    db.setDatabase(normalizeDatabase({ table: { data: [
      { id: 1, name: 'Bank', category: 'Finance/Banking' },
      { id: 2, name: 'Mail', category: 'Work' },
    ] } }))
    state = useCategoryState()
    state.selectOnly(null)
    state.expanded.value = new Set()
    notify = vi.fn()
    confirm = vi.fn(async () => true)
    actions = useCategoryActions(notify, confirm)
  })

  it('creates a category and reveals it', () => {
    expect(actions.createCategory('Finance/Cards')).toBe('Finance/Cards')
    expect(db.categoryPaths).toContain('Finance/Cards')
    expect(state.expanded.value.has('Finance')).toBe(true)
  })

  it('reports invalid names instead of throwing', () => {
    expect(actions.createCategory('  ')).toBeNull()
    actions.renameCategory('Work', 'A/B')
    expect(notify).toHaveBeenCalledWith('Cannot rename category', expect.stringContaining('/'), 'error')
  })

  it('renames a category and keeps it selected', () => {
    state.selectOnly('Finance/Banking')
    actions.renameCategory('Finance', 'Money')
    expect(db.table.data[0].category).toBe('Money/Banking')
    expect(state.selected.value).toBe('Money/Banking')
  })

  it('moves a category and refuses to move it into itself', () => {
    actions.moveCategories(['Finance/Banking'], 'Work')
    expect(db.table.data[0].category).toBe('Work/Banking')
    actions.moveCategories(['Work'], 'Work/Banking')
    expect(notify).toHaveBeenCalledWith('Cannot move category', expect.any(String), 'error')
  })

  it('deletes after confirming; entries move one level up', async () => {
    state.selectOnly('Finance/Banking')
    expect(await actions.deleteCategory('Finance/Banking')).toBe(true)
    expect(confirm.mock.calls[0][0].message).toContain('1 entries')
    expect(db.table.data[0].category).toBe('Finance')
    expect(state.selected.value).toBe('Finance')
  })

  it('does nothing when deleting is cancelled', async () => {
    confirm.mockResolvedValue(false)
    expect(await actions.deleteCategory('Work')).toBe(false)
    expect(db.table.data[1].category).toBe('Work')
  })
})
