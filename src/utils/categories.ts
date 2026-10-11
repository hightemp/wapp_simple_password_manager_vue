/**
 * Categories are stored on entries as paths: "Work/Email/Old".
 * An empty string means "no category". All helpers here are pure.
 */

export const SEPARATOR = '/'

// Drag & drop payload with a JSON list of entry ids (table rows → category tree)
export const ENTRIES_DRAG_TYPE = 'application/x-pm-entries'

export interface CategoryNode {
  path: string
  name: string
  children: CategoryNode[]
  // Entries in this category and all its subcategories
  count: number
}

/** Trim segments and drop empty ones: " Work // Email " → "Work/Email" */
export function normalizePath(path: string | null | undefined): string {
  return String(path ?? '')
    .split(SEPARATOR)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(SEPARATOR)
}

/** "Work/Email" → "Work"; root categories → "" */
export function parentPath(path: string): string {
  const index = path.lastIndexOf(SEPARATOR)
  return index === -1 ? '' : path.slice(0, index)
}

/** "Work/Email" → "Email" */
export function pathName(path: string): string {
  return path.slice(path.lastIndexOf(SEPARATOR) + 1)
}

export function joinPath(parent: string, name: string): string {
  return normalizePath(parent ? parent + SEPARATOR + name : name)
}

/** True when `path` is `ancestor` itself or one of its subcategories */
export function isWithin(path: string, ancestor: string): boolean {
  return path === ancestor || path.startsWith(ancestor + SEPARATOR)
}

/** "Work/Email/Old" → ["Work", "Work/Email", "Work/Email/Old"] */
export function withAncestors(path: string): string[] {
  const segments = path.split(SEPARATOR)
  return segments.map((_, i) => segments.slice(0, i + 1).join(SEPARATOR))
}

/**
 * Move everything under `from` to `to`, keeping the rest of the path:
 * replacePrefix("Work/Email/Old", "Work/Email", "Mail") → "Mail/Old".
 * Paths outside `from` are returned unchanged.
 */
export function replacePrefix(path: string, from: string, to: string): string {
  if (!isWithin(path, from)) return path
  return normalizePath(to + path.slice(from.length))
}

/** All distinct category paths (incl. ancestors), sorted case-insensitively */
export function collectPaths(explicit: string[], entryCategories: string[]): string[] {
  const paths = new Set<string>()
  for (const raw of [...explicit, ...entryCategories]) {
    const path = normalizePath(raw)
    if (path) withAncestors(path).forEach((p) => paths.add(p))
  }
  return [...paths].sort(comparePaths)
}

function comparePaths(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
}

/** Build the category tree with entry counts (including subcategories) */
export function buildTree(paths: string[], entryCategories: string[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>()
  const roots: CategoryNode[] = []

  for (const path of collectPaths(paths, entryCategories)) {
    const node: CategoryNode = { path, name: pathName(path), children: [], count: 0 }
    nodes.set(path, node)
    const parent = nodes.get(parentPath(path))
    ;(parent ? parent.children : roots).push(node)
  }

  for (const raw of entryCategories) {
    const path = normalizePath(raw)
    if (!path) continue
    for (const ancestor of withAncestors(path)) nodes.get(ancestor)!.count++
  }

  return roots
}
