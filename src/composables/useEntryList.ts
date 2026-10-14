import { ref, computed } from 'vue'
import { sharedComposable } from '@/composables/sharedComposable'
import { useDatabaseStore, type Entry } from '@/stores/database'
import { useCategoryState, type CategorySelection } from '@/composables/useCategoryState'
import { useMediaQuery, MOBILE_QUERY } from '@/composables/useMediaQuery'
import { isWithin } from '@/utils/categories'
import { entryType, mainSecret, entryUrl, expiryStatus, EXPIRING_FILTER } from '@/types/entryTypes'

// Table columns: the same for every entry type (see entryTypes.ts)
export const TABLE_COLUMNS = [
  { key: 'name', label: 'Name', width: 'minmax(140px, 1.4fr)', filter: true },
  { key: 'details', label: 'Details', width: 'minmax(120px, 1.2fr)', filter: true },
  { key: 'secret', label: 'Secret', width: 'minmax(180px, 0.8fr)', filter: false },
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

/** Search covers every field of an entry, custom ones included; `query` is lower-case */
export function matchesSearch(entry: Entry, query: string): boolean {
  return Object.entries(entry).some(([key, value]) =>
    key !== 'type' && typeof value === 'string' && value.toLowerCase().includes(query))
}

/** Whether an entry is in one of the selected categories ([null] = all entries) */
export function inCategories(entry: Entry, categories: CategorySelection[]): boolean {
  return categories.some((category) => {
    if (category === null) return true
    if (category === '') return !entry.category
    return isWithin(entry.category ?? '', category)
  })
}

export function sortEntries(rows: Entry[], key: string, ascending: boolean): Entry[] {
  const direction = ascending ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = cellValue(a, key).toLowerCase()
    const right = cellValue(b, key).toLowerCase()
    if (left < right) return -direction
    if (left > right) return direction
    return 0
  })
}

function createEntryList() {
  const db = useDatabaseStore()
  const { trashSelected, typeFilter, effectiveSelection, effectiveSelections } = useCategoryState()

  // Mobile layout: card list with a single search field instead of the table
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const searchQuery = ref('')
  const sortKey = ref<string | null>(null)
  const sortAsc = ref(true)

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
    if (isMobile.value) {
      // Column filters are not visible on mobile — use the search field only
      const query = searchQuery.value.trim().toLowerCase()
      if (query) rows = rows.filter((entry) => matchesSearch(entry, query))
    } else {
      // Only filters of visible columns apply (a stored filter on a hidden column is ignored)
      const filter = db.table.filter
      const keys = TABLE_COLUMNS.filter((column) => column.filter && filter[column.key]).map((column) => column.key)
      rows = rows.filter((entry) => keys.every((key) => cellValue(entry, key).includes(filter[key])))
    }
    return sortKey.value ? sortEntries(rows, sortKey.value, sortAsc.value) : rows
  })

  function toggleSort(key: string) {
    if (sortKey.value === key) {
      sortAsc.value = !sortAsc.value
    } else {
      sortKey.value = key
      sortAsc.value = true
    }
  }

  return {
    isMobile, searchQuery, sortKey, sortAsc, isTrashView, activeCategory, activeCategories,
    filteredRows, toggleSort,
  }
}

/** The entries listed in the table / card list: category, type, search, filters and sorting */
export const useEntryList = sharedComposable(createEntryList)
