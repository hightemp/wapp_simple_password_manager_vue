import { ref, computed, watch } from 'vue'
import { isWithin, replacePrefix, withAncestors } from '@/utils/categories'

// Per-browser UI state of the category panel (not stored in the database)
const STORAGE_KEY = 'categoryPanel'

/** Selected filter: null = all entries, '' = uncategorized, otherwise a category path */
export type CategorySelection = string | null

interface StoredState {
  // Primary selection (anchor for Shift+click) …
  selected: CategorySelection
  // … plus categories added with Ctrl/⌘+click or Shift+click ('' = uncategorized)
  extra: string[]
  expanded: string[]
  width: number
  collapsed: boolean
}

export const PANEL_MIN_WIDTH = 160
export const PANEL_MAX_WIDTH = 480
const DEFAULT_STATE: StoredState = { selected: null, extra: [], expanded: [], width: 220, collapsed: false }

function load(): StoredState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!stored || typeof stored !== 'object') return { ...DEFAULT_STATE }
    return {
      selected: typeof stored.selected === 'string' ? stored.selected : null,
      extra: stringList(stored.extra),
      expanded: stringList(stored.expanded),
      width: Number.isFinite(stored.width) ? clampWidth(stored.width) : DEFAULT_STATE.width,
      collapsed: stored.collapsed === true,
    }
  } catch (_) {
    return { ...DEFAULT_STATE }
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function clampWidth(width: number): number {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, Math.round(width)))
}

// Module-level so every component shares one state
const initial = load()
const selected = ref<CategorySelection>(initial.selected)
const extra = ref<string[]>(initial.selected === null ? [] : initial.extra)
const expanded = ref(new Set(initial.expanded))
const width = ref(initial.width)
const collapsed = ref(initial.collapsed)
// The trash is shown instead of a category (not remembered across reloads)
const trashSelected = ref(false)
// Only entries of this type are listed (null = all types; not remembered either)
const typeFilter = ref<string | null>(null)

watch([selected, extra, expanded, width, collapsed], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      selected: selected.value,
      extra: extra.value,
      expanded: [...expanded.value],
      width: width.value,
      collapsed: collapsed.value,
    }))
  } catch (_) {
    // Storage unavailable (private mode) — state just won't persist
  }
}, { deep: true })

export function useCategoryState() {
  function toggleExpanded(path: string) {
    const next = new Set(expanded.value)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    expanded.value = next
  }

  /** Expand all ancestors so `path` is visible */
  function reveal(path: string) {
    const next = new Set(expanded.value)
    withAncestors(path).slice(0, -1).forEach((p) => next.add(p))
    expanded.value = next
  }

  // --- selection ---

  /** Every selected category (null = All); used for highlighting */
  const selectedSet = computed(() => new Set<CategorySelection>([selected.value, ...extra.value]))

  /** Plain click: select one category (null = All, '' = Uncategorized) */
  function selectOnly(path: CategorySelection) {
    selected.value = path
    extra.value = []
    trashSelected.value = false
  }

  function selectTrash() {
    trashSelected.value = true
  }

  /** Show only entries of a type; selecting the current one again shows all types */
  function toggleType(type: string | null) {
    typeFilter.value = typeFilter.value === type ? null : type
  }

  /** Ctrl/⌘+click: add or remove a category; "All" cannot be combined with others */
  function toggleSelection(path: string) {
    if (selected.value === null || trashSelected.value) return selectOnly(path)
    if (selected.value === path) {
      // Removing the primary one promotes the next selected category
      const [next, ...rest] = extra.value
      if (next === undefined) return
      selected.value = next
      extra.value = rest
    } else if (extra.value.includes(path)) {
      extra.value = extra.value.filter((p) => p !== path)
    } else {
      extra.value = [...extra.value, path]
    }
  }

  /** Shift+click: select `paths` (a visible range), keeping the primary category as the anchor */
  function selectRange(paths: string[]) {
    trashSelected.value = false
    if (selected.value === null || !paths.includes(selected.value)) {
      selected.value = paths[0] ?? null
    }
    extra.value = paths.filter((p) => p !== selected.value)
  }

  /** Keep selection/expansion pointing at a category after it was renamed or moved */
  function followRename(from: string, to: string) {
    if (selected.value && isWithin(selected.value, from)) selected.value = replacePrefix(selected.value, from, to)
    extra.value = unique(extra.value.map((p) => (p && isWithin(p, from) ? replacePrefix(p, from, to) : p)))
    expanded.value = new Set([...expanded.value].map((p) => replacePrefix(p, from, to)))
    if (to) reveal(to)
  }

  /** After deleting a category its subcategories move up to `parent` — follow them */
  function followDelete(path: string, parent: string) {
    const current = selected.value
    if (current === path) selected.value = parent || null
    else if (current && isWithin(current, path)) selected.value = replacePrefix(current, path, parent)
    extra.value = unique(extra.value
      .filter((p) => p !== path)
      .map((p) => (p && isWithin(p, path) ? replacePrefix(p, path, parent) : p)))
    // "All" cannot be combined with other categories — promote the next selected one
    if (selected.value === null && extra.value.length) {
      const [next, ...rest] = extra.value
      selected.value = next
      extra.value = rest
    }
    expanded.value = new Set(
      [...expanded.value].filter((p) => p !== path).map((p) => replacePrefix(p, path, parent)),
    )
  }

  /**
   * The selection to filter by: a remembered category that does not exist in the open
   * database (e.g. another repository) falls back to "All" without forgetting it.
   */
  function effectiveSelection(paths: string[]): CategorySelection {
    const current = selected.value
    return current && !paths.includes(current) ? null : current
  }

  /** All categories to filter by; [null] means all entries */
  function effectiveSelections(paths: string[]): CategorySelection[] {
    const primary = effectiveSelection(paths)
    if (primary === null) return [null]
    const others = extra.value.filter((p) => p === '' || paths.includes(p))
    return unique([primary, ...others])
  }

  return {
    selected, extra, selectedSet, expanded, width, collapsed, trashSelected, typeFilter,
    selectOnly, selectTrash, toggleType, toggleSelection, selectRange,
    toggleExpanded, reveal, followRename, followDelete, effectiveSelection, effectiveSelections,
  }
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}
