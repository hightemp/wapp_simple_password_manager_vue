import { ref, computed, watch } from 'vue'
import { sharedComposable } from '@/composables/sharedComposable'
import { useDatabaseStore, type Entry } from '@/stores/database'
import { useCategoryState, type CategorySelection } from '@/composables/useCategoryState'
import { useMediaQuery, MOBILE_QUERY } from '@/composables/useMediaQuery'
import { isWithin } from '@/utils/categories'
import { entryType, mainSecret, entryUrl, expiryStatus, describeField, isSecretKind, EXPIRING_FILTER } from '@/types/entryTypes'

// Table columns: the same for every entry type (see entryTypes.ts)
export const TABLE_COLUMNS = [
  { key: 'name', label: 'Name', width: 'minmax(140px, 1.4fr)', filter: true },
  { key: 'details', label: 'Details', width: 'minmax(120px, 1.2fr)', filter: true },
  // Not filtered or sorted: the order would give away something about the secrets
  { key: 'secret', label: 'Secret', width: 'minmax(180px, 0.8fr)', filter: false, sortable: false },
  { key: 'url', label: 'URL', width: 'minmax(100px, 1fr)', filter: true },
  { key: 'description', label: 'Notes', width: 'minmax(80px, 1fr)', filter: true },
]

/** Text of a table column for an entry (used for display, filtering and sorting) */
export function cellValue(entry: Entry, key: string): string {
  switch (key) {
    case 'details': return entryType(entry).details(entry)
    case 'secret': return mainSecret(entry)?.value ?? ''
    case 'url': return entryUrl(entry)
    default: return String(entry[key] ?? '')
  }
}

/**
 * Search covers every field of an entry, custom ones included, except secrets (passwords,
 * PINs, keys…): a search must not find entries by their password. `query` is lower-case.
 */
export function matchesSearch(entry: Entry, query: string): boolean {
  return Object.entries(entry).some(([key, value]) =>
    key !== 'type' && typeof value === 'string' && value.toLowerCase().includes(query)
    && !isSecretKind(describeField(entry, key).kind))
}

/** Sorting of the list: a table column, or 'added' (order of creation) */
export interface EntrySort {
  key: string
  ascending: boolean
}

// Sort keys besides the table columns
export const ADDED_SORT = 'added'
const SORT_STORAGE_KEY = 'entrySort'

/** Whether an entry is in one of the selected categories ([null] = all entries) */
export function inCategories(entry: Entry, categories: CategorySelection[]): boolean {
  return categories.some((category) => {
    if (category === null) return true
    if (category === '') return !entry.category
    return isWithin(entry.category ?? '', category)
  })
}

// Case-insensitive, numbers in natural order ("Entry 2" before "Entry 10")
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function sortEntries(rows: Entry[], key: string, ascending: boolean): Entry[] {
  const direction = ascending ? 1 : -1
  if (key === ADDED_SORT) return [...rows].sort((a, b) => ((a.id ?? 0) - (b.id ?? 0)) * direction)
  return [...rows].sort((a, b) => collator.compare(cellValue(a, key), cellValue(b, key)) * direction)
}

function loadSort(): EntrySort | null {
  try {
    const stored = JSON.parse(localStorage.getItem(SORT_STORAGE_KEY) ?? 'null')
    const known = stored?.key === ADDED_SORT || TABLE_COLUMNS.some((column) => column.key === stored?.key && column.sortable !== false)
    return known ? { key: stored.key, ascending: stored.ascending !== false } : null
  } catch (_) {
    return null
  }
}

function createEntryList() {
  const db = useDatabaseStore()
  const { trashSelected, typeFilter, effectiveSelection, effectiveSelections } = useCategoryState()

  // Mobile layout: card list with a single search field instead of the table
  const isMobile = useMediaQuery(MOBILE_QUERY)
  // One search field: above the table, or above the card list
  const searchQuery = ref('')
  // Remembered in this browser; null = the order of the database
  const sort = ref<EntrySort | null>(loadSort())
  watch(sort, (value) => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(value))
    } catch (_) {
      // Storage unavailable (private mode) — the sorting just won't persist
    }
  })
  const sortKey = computed(() => sort.value?.key ?? null)
  const sortAsc = computed(() => sort.value?.ascending ?? true)

  // Deleted entries are listed instead of a category
  const isTrashView = computed(() => trashSelected.value)
  // Primary selected category: null = all, '' = uncategorized
  const activeCategory = computed(() => effectiveSelection(db.categoryPaths))
  // Every selected category the list is filtered by ([null] = all entries)
  const activeCategories = computed(() => effectiveSelections(db.categoryPaths))

  const filteredRows = computed(() => {
    let rows = isTrashView.value
      ? db.trash.map((item) => item.entry)
      : db.table.data.filter((entry) => inCategories(entry, activeCategories.value))
    if (typeFilter.value === EXPIRING_FILTER) rows = rows.filter((entry) => expiryStatus(entry))
    else if (typeFilter.value) rows = rows.filter((entry) => entryType(entry).id === typeFilter.value)
    const query = searchQuery.value.trim().toLowerCase()
    if (query) rows = rows.filter((entry) => matchesSearch(entry, query))
    // Column filters are not visible on mobile. Only filters of visible columns apply
    // (a stored filter on a hidden column is ignored); case doesn't matter
    if (!isMobile.value) {
      const filters = activeFilters.value
      rows = rows.filter((entry) => filters.every(([key, text]) => cellValue(entry, key).toLowerCase().includes(text)))
    }
    return sort.value ? sortEntries(rows, sort.value.key, sort.value.ascending) : rows
  })

  // [column, lower-case text] of the column filters in use
  const activeFilters = computed(() => TABLE_COLUMNS
    .filter((column) => column.filter && db.table.filter[column.key])
    .map((column) => [column.key, db.table.filter[column.key].toLowerCase()] as const))

  // Rows are hidden by the search or a column filter (not by the category or type)
  const isFiltered = computed(() => searchQuery.value.trim() !== '' || (!isMobile.value && activeFilters.value.length > 0))

  /** Header click: ascending → descending → back to the database order */
  function toggleSort(key: string) {
    if (sort.value?.key !== key) sort.value = { key, ascending: true }
    else if (sort.value.ascending) sort.value = { key, ascending: false }
    else sort.value = null
  }

  function setSort(value: EntrySort | null) {
    sort.value = value
  }

  function clearSearchAndFilters() {
    searchQuery.value = ''
    for (const key of Object.keys(db.table.filter)) db.setFilter(key, '')
  }

  return {
    isMobile, searchQuery, sort, sortKey, sortAsc, isTrashView, activeCategory, activeCategories,
    filteredRows, isFiltered, toggleSort, setSort, clearSearchAndFilters,
  }
}

/** The entries listed in the table / card list: category, type, search, filters and sorting */
export const useEntryList = sharedComposable(createEntryList)
