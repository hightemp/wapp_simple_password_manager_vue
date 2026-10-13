import type { CustomFieldKind } from '@/types/entryTypes'

/** An entry read from another password manager's export */
export interface ImportedEntry {
  // Entry type id (see ENTRY_TYPES)
  type: string
  name: string
  // Folder path in the source app ('' = none); the import prefix is added in front
  category: string
  // Values of the type's fields (and the shared `description` = Notes)
  fields: Record<string, string>
  // Values that have no field in the type — become custom fields
  custom: { label: string; kind: CustomFieldKind; value: string }[]
}

export interface ImportResult {
  // Name of the source app, used for the "Imported/<source>" category
  source: string
  entries: ImportedEntry[]
  // Problems that did not stop the import (skipped rows, unknown item types, …)
  warnings: string[]
}

export type ImportFormat =
  | 'bitwarden-json' | 'bitwarden-csv'
  | 'keepassxc-csv' | 'keepass-xml'
  | 'chrome-csv' | 'firefox-csv' | 'safari-csv'
  | 'onepassword-1pux' | 'onepassword-csv'
  | 'lastpass-csv'
  | 'generic-csv'

/** Builds an entry, dropping empty values */
export function entry(
  type: string,
  name: string,
  fields: Record<string, unknown>,
  { category = '', custom = [] as ImportedEntry['custom'] } = {},
): ImportedEntry {
  const clean: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    const text = value == null ? '' : String(value).trim()
    if (text) clean[key] = text
  }
  return {
    type,
    name: (name ?? '').trim() || clean.login || clean.url || '(no name)',
    category: (category ?? '').trim(),
    fields: clean,
    custom: custom.filter((field) => field.value?.trim()),
  }
}

/** TOTP secrets are kept as a secret custom field until TOTP codes are supported */
export function totpField(value: unknown): ImportedEntry['custom'] {
  const text = value == null ? '' : String(value).trim()
  return text ? [{ label: 'TOTP', kind: 'secret', value: text }] : []
}

/** "https://www.github.com/login" → "github.com" (a name for entries that have none) */
export function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch (_) {
    return url
  }
}
