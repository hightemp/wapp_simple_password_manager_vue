import { ref, watch } from 'vue'
import { isWithin, replacePrefix, withAncestors } from '@/utils/categories'

// Per-browser UI state of the category panel (not stored in the database)
const STORAGE_KEY = 'categoryPanel'

/** Selected filter: null = all entries, '' = uncategorized, otherwise a category path */
export type CategorySelection = string | null

interface StoredState {
  selected: CategorySelection
  expanded: string[]
  width: number
  collapsed: boolean
}

export const PANEL_MIN_WIDTH = 160
export const PANEL_MAX_WIDTH = 480
const DEFAULT_STATE: StoredState = { selected: null, expanded: [], width: 220, collapsed: false }

function load(): StoredState {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!stored || typeof stored !== 'object') return { ...DEFAULT_STATE }
    return {
      selected: typeof stored.selected === 'string' ? stored.selected : null,
      expanded: Array.isArray(stored.expanded) ? stored.expanded.filter((p: unknown) => typeof p === 'string') : [],
      width: Number.isFinite(stored.width) ? clampWidth(stored.width) : DEFAULT_STATE.width,
      collapsed: stored.collapsed === true,
    }
  } catch (_) {
    return { ...DEFAULT_STATE }
  }
}

export function clampWidth(width: number): number {
  return Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, Math.round(width)))
}

// Module-level so every component shares one state
const initial = load()
const selected = ref<CategorySelection>(initial.selected)
const expanded = ref(new Set(initial.expanded))
const width = ref(initial.width)
const collapsed = ref(initial.collapsed)

watch([selected, expanded, width, collapsed], () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      selected: selected.value,
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

  /** Keep selection/expansion pointing at a category after it was renamed or moved */
  function followRename(from: string, to: string) {
    if (selected.value && isWithin(selected.value, from)) selected.value = replacePrefix(selected.value, from, to)
    expanded.value = new Set([...expanded.value].map((p) => replacePrefix(p, from, to)))
    if (to) reveal(to)
  }

  /** After deleting a category its subcategories move up to `parent` — follow them */
  function followDelete(path: string, parent: string) {
    const current = selected.value
    if (current === path) selected.value = parent || null
    else if (current && isWithin(current, path)) selected.value = replacePrefix(current, path, parent)
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

  return {
    selected, expanded, width, collapsed,
    toggleExpanded, reveal, followRename, followDelete, effectiveSelection,
  }
}
