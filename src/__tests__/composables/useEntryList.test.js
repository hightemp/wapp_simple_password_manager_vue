import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useDatabaseStore, normalizeDatabase } from '../../stores/database'
import { useCategoryState } from '../../composables/useCategoryState'
import { resetSharedComposables } from '../../composables/sharedComposable'
import { useEntryList, cellValue, matchesSearch, inCategories, sortEntries } from '../../composables/useEntryList'
import { useEntrySelection } from '../../composables/useEntrySelection'

let mobile = false

beforeAll(() => {
  // jsdom has no matchMedia
  window.matchMedia = () => ({ matches: mobile, addEventListener() {}, removeEventListener() {} })
})

const ENTRIES = [
  { id: 1, name: 'Gmail', login: 'me@gmail.com', password: 'p1', url: 'https://mail.google.com', category: 'Mail', description: '' },
  { id: 2, name: 'bank', type: 'card', card_number: '4111 1111 1111 1111', cardholder: 'ME', category: 'Finance/Cards', description: 'visa' },
  { id: 3, name: 'Alpha', login: 'alpha', password: 'p3', category: '', description: 'old' },
  { id: 4, name: 'Work VPN', login: 'w', password: 'p4', category: 'Work', description: '' },
]

function setup({ isMobile = false } = {}) {
  mobile = isMobile
  localStorage.removeItem('entrySort')
  setActivePinia(createPinia())
  resetSharedComposables()
  const categories = useCategoryState()
  categories.selectOnly(null)
  categories.typeFilter.value = null
  const db = useDatabaseStore()
  db.setDatabase(normalizeDatabase({ table: { data: structuredClone(ENTRIES), filter: {}, page: 1 } }))
  return { db, categories, list: useEntryList() }
}

const names = (rows) => rows.map((entry) => entry.name)

describe('useEntryList helpers', () => {
  it('cellValue reads the type columns', () => {
    expect(cellValue(ENTRIES[0], 'name')).toBe('Gmail')
    expect(cellValue(ENTRIES[0], 'secret')).toBe('p1')
    expect(cellValue(ENTRIES[0], 'url')).toBe('https://mail.google.com')
    expect(cellValue(ENTRIES[1], 'secret')).toBe('4111 1111 1111 1111')
    expect(cellValue(ENTRIES[2], 'missing')).toBe('')
  })

  it('matchesSearch looks at every string field except the type and secrets', () => {
    expect(matchesSearch(ENTRIES[1], 'visa')).toBe(true)
    expect(matchesSearch({ type: 'wifi', name: 'Home' }, 'wifi')).toBe(false)
    expect(matchesSearch(ENTRIES[0], 'gmail.com')).toBe(true)
    // Passwords, card numbers and secret custom fields are not searched
    expect(matchesSearch(ENTRIES[0], 'p1')).toBe(false)
    expect(matchesSearch(ENTRIES[1], '4111')).toBe(false)
    const custom = { name: 'X', custom: [{ id: 'a', label: 'Word', kind: 'secret' }, { id: 'b', label: 'Note', kind: 'text' }], 'custom:a': 'hidden', 'custom:b': 'shown' }
    expect(matchesSearch(custom, 'hidden')).toBe(false)
    expect(matchesSearch(custom, 'shown')).toBe(true)
  })

  it('inCategories handles all, uncategorized and subcategories', () => {
    expect(inCategories(ENTRIES[1], [null])).toBe(true)
    expect(inCategories(ENTRIES[1], ['Finance'])).toBe(true)
    expect(inCategories(ENTRIES[1], ['Fin'])).toBe(false)
    expect(inCategories(ENTRIES[2], [''])).toBe(true)
    expect(inCategories(ENTRIES[0], ['', 'Work'])).toBe(false)
  })

  it('sortEntries sorts case-insensitively without changing the input', () => {
    const input = [...ENTRIES]
    expect(names(sortEntries(input, 'name', true))).toEqual(['Alpha', 'bank', 'Gmail', 'Work VPN'])
    expect(names(sortEntries(input, 'name', false))).toEqual(['Work VPN', 'Gmail', 'bank', 'Alpha'])
    expect(names(input)).toEqual(names(ENTRIES))
    expect(names(sortEntries(input, 'added', false))).toEqual(['Work VPN', 'Alpha', 'bank', 'Gmail'])
    // Numbers in natural order
    expect(names(sortEntries([{ name: 'Entry 10' }, { name: 'entry 2' }, { name: 'Entry 1' }], 'name', true))).toEqual(['Entry 1', 'entry 2', 'Entry 10'])
  })
})

describe('useEntryList', () => {
  beforeEach(() => setup())

  it('lists every entry by default', () => {
    expect(useEntryList().filteredRows.value).toHaveLength(4)
  })

  it('filters by category and type', () => {
    const { categories, list } = setup()
    categories.selectOnly('Finance')
    expect(names(list.filteredRows.value)).toEqual(['bank'])
    categories.selectOnly(null)
    categories.typeFilter.value = 'login'
    expect(names(list.filteredRows.value)).toEqual(['Gmail', 'Alpha', 'Work VPN'])
  })

  it('applies the search and case-insensitive column filters on desktop', () => {
    const { db, list } = setup()
    db.setFilter('name', 'A')
    expect(names(list.filteredRows.value)).toEqual(['Gmail', 'bank', 'Alpha'])
    expect(list.isFiltered.value).toBe(true)
    list.searchQuery.value = 'MAIL'
    expect(names(list.filteredRows.value)).toEqual(['Gmail'])
    list.clearSearchAndFilters()
    expect(list.filteredRows.value).toHaveLength(4)
    expect(list.isFiltered.value).toBe(false)
  })

  it('applies the search field on mobile and ignores column filters', () => {
    const { db, list } = setup({ isMobile: true })
    db.setFilter('name', 'nothing')
    list.searchQuery.value = '  OLD '
    expect(names(list.filteredRows.value)).toEqual(['Alpha'])
  })

  it('toggles sorting by a column: ascending, descending, off', () => {
    const { list } = setup()
    list.toggleSort('name')
    expect(names(list.filteredRows.value)).toEqual(['Alpha', 'bank', 'Gmail', 'Work VPN'])
    list.toggleSort('name')
    expect(list.sortAsc.value).toBe(false)
    expect(names(list.filteredRows.value)[0]).toBe('Work VPN')
    list.toggleSort('name')
    expect(list.sortKey.value).toBeNull()
    expect(names(list.filteredRows.value)).toEqual(names(ENTRIES))
  })

  it('remembers the sorting in this browser', async () => {
    const { list } = setup()
    list.setSort({ key: 'added', ascending: false })
    await nextTick()
    expect(JSON.parse(localStorage.getItem('entrySort'))).toEqual({ key: 'added', ascending: false })
    // A new list (next visit) starts with it; unknown or unsortable keys are ignored
    resetSharedComposables()
    expect(useEntryList().sortKey.value).toBe('added')
    localStorage.setItem('entrySort', JSON.stringify({ key: 'secret', ascending: true }))
    resetSharedComposables()
    expect(useEntryList().sort.value).toBeNull()
  })

  it('lists the trash instead of a category', () => {
    const { db, categories, list } = setup()
    db.removeEntries([2])
    categories.selectTrash()
    expect(list.isTrashView.value).toBe(true)
    expect(names(list.filteredRows.value)).toEqual(['bank'])
  })
})

describe('useEntrySelection', () => {
  function rowsById(db) {
    return (id) => db.table.data.find((entry) => entry.id === id)
  }

  it('selects one row, toggles with Ctrl and selects ranges with Shift', () => {
    const { db } = setup()
    const row = rowsById(db)
    const selection = useEntrySelection()

    selection.selectRow(row(1))
    expect([...selection.selectedIds.value]).toEqual([1])

    selection.selectRow(row(3), { ctrlKey: true })
    expect([...selection.selectedIds.value]).toEqual([1, 3])
    expect(selection.selectedEntry.value.id).toBe(3)

    // Ctrl+click on the focused row unselects it and focuses the previous one
    selection.selectRow(row(3), { metaKey: true })
    expect([...selection.selectedIds.value]).toEqual([1])
    expect(selection.selectedEntry.value.id).toBe(1)

    selection.selectRow(row(1))
    selection.selectRow(row(4), { shiftKey: true })
    expect([...selection.selectedIds.value].sort()).toEqual([1, 2, 3, 4])
    expect(selection.selectedEntry.value.id).toBe(4)

    selection.collapseSelection()
    expect([...selection.selectedIds.value]).toEqual([4])
  })

  it('replaces the multi-selection when the focused entry changes', async () => {
    const { db } = setup()
    const row = rowsById(db)
    const selection = useEntrySelection()
    selection.selectRow(row(1))
    selection.selectRow(row(2), { ctrlKey: true })
    selection.selectedEntry.value = row(4)
    await nextTick()
    expect([...selection.selectedIds.value]).toEqual([4])
    selection.clearSelection()
    await nextTick()
    expect(selection.selectedIds.value.size).toBe(0)
  })

  it('drops rows that left the list', async () => {
    const { db } = setup()
    const row = rowsById(db)
    const selection = useEntrySelection()
    selection.selectRow(row(2))
    selection.selectRow(row(1), { ctrlKey: true })
    db.removeEntries([2])
    await nextTick()
    expect([...selection.selectedIds.value]).toEqual([1])
    expect(selection.selectedEntry.value.id).toBe(1)

    // Removing the focused entry clears the selection
    db.removeEntries([1])
    await nextTick()
    expect(selection.selectedEntry.value).toBeNull()
    expect(selection.selectedIds.value.size).toBe(0)
  })

  it('points the selection at the new entry objects after a merge', () => {
    const { db } = setup()
    const selection = useEntrySelection()
    selection.selectRow(rowsById(db)(3))
    db.setDatabase(normalizeDatabase({ table: { data: structuredClone(ENTRIES), filter: {}, page: 1 } }))
    selection.refreshSelection()
    expect(selection.selectedEntry.value).toBe(db.table.data[2])
  })
})
