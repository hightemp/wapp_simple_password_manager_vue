import { cardBrand, lastFour } from '@/utils/card'

/**
 * Entry types: which fields an entry has and how they are shown.
 * Field values are stored as string properties of the entry under `key`; the keys
 * `category`, `name` and `description` (Notes) are shared by all types.
 */

export type FieldKind =
  | 'text' | 'secret' | 'multiline' | 'secret_multiline'
  | 'url' | 'email' | 'phone' | 'date' | 'month_year' | 'card_number'

export interface FieldDef {
  key: string
  label: string
  kind: FieldKind
  placeholder?: string
}

/** A field added by the user to one entry; its value is stored under customKey(id) */
export interface CustomField {
  id: string
  label: string
  kind: CustomFieldKind
}

export type CustomFieldKind = 'text' | 'secret' | 'multiline' | 'secret_multiline' | 'url' | 'email' | 'phone' | 'date'

export const CUSTOM_FIELD_KINDS: { kind: CustomFieldKind; label: string }[] = [
  { kind: 'text', label: 'Text' },
  { kind: 'secret', label: 'Secret' },
  { kind: 'multiline', label: 'Multi-line text' },
  { kind: 'secret_multiline', label: 'Secret multi-line text' },
  { kind: 'url', label: 'URL' },
  { kind: 'email', label: 'Email' },
  { kind: 'phone', label: 'Phone' },
  { kind: 'date', label: 'Date' },
]

type Values = Record<string, any>

export interface EntryTypeDef {
  id: string
  label: string
  icon: string
  // Fields after Category and Name, in form order
  fields: FieldDef[]
  // Main secret shown (masked) in the Secret column
  secret?: string
  // Field shown in the URL column
  url?: string
  // Fields with a copy button on the mobile card
  quickCopy: string[]
  // Short text for the Details column / card subtitle
  details: (entry: Values) => string
  // Show the password generator in the form (it fills `password`)
  generator?: boolean
}

export const DEFAULT_TYPE = 'login'

const NOTES: FieldDef = { key: 'description', label: 'Notes', kind: 'multiline' }

const join = (parts: unknown[], separator = ' · ') =>
  parts.map((part) => String(part ?? '').trim()).filter(Boolean).join(separator)

export const ENTRY_TYPES: EntryTypeDef[] = [
  {
    id: 'login',
    label: 'Login',
    icon: 'i-lucide-key-round',
    fields: [
      { key: 'login', label: 'Login', kind: 'text' },
      { key: 'password', label: 'Password', kind: 'secret' },
      { key: 'url', label: 'URL', kind: 'url' },
      NOTES,
    ],
    secret: 'password',
    url: 'url',
    quickCopy: ['login', 'password'],
    details: (entry) => entry.login ?? '',
    generator: true,
  },
  {
    id: 'api_key',
    label: 'API Key',
    icon: 'i-lucide-code-xml',
    fields: [
      { key: 'api_key', label: 'Key', kind: 'secret' },
      { key: 'api_secret', label: 'Secret', kind: 'secret' },
      { key: 'environment', label: 'Environment', kind: 'text', placeholder: 'production, staging…' },
      { key: 'scopes', label: 'Scopes', kind: 'text' },
      { key: 'expires', label: 'Expires', kind: 'date' },
      { key: 'url', label: 'Console URL', kind: 'url' },
      NOTES,
    ],
    secret: 'api_key',
    url: 'url',
    quickCopy: ['api_key'],
    details: (entry) => join([entry.environment, entry.expires && `until ${formatDate(entry.expires)}`]),
  },
  {
    id: 'card',
    label: 'Card',
    icon: 'i-lucide-credit-card',
    fields: [
      { key: 'cardholder', label: 'Cardholder', kind: 'text' },
      { key: 'card_number', label: 'Number', kind: 'card_number' },
      { key: 'card_expiry', label: 'Expiry', kind: 'month_year', placeholder: 'MM/YY' },
      { key: 'cvv', label: 'CVV', kind: 'secret' },
      { key: 'pin', label: 'PIN', kind: 'secret' },
      { key: 'bank', label: 'Bank', kind: 'text' },
      { key: 'bank_phone', label: 'Bank phone', kind: 'phone' },
      NOTES,
    ],
    secret: 'card_number',
    quickCopy: ['card_number'],
    details: (entry) => join([
      join([cardBrand(entry.card_number ?? ''), entry.card_number && `•••• ${lastFour(entry.card_number)}`], ' '),
      entry.card_expiry,
    ]),
  },
  {
    id: 'secure_note',
    label: 'Secure Note',
    icon: 'i-lucide-notebook-pen',
    fields: [
      { key: 'note', label: 'Note', kind: 'secret_multiline' },
    ],
    secret: 'note',
    quickCopy: ['note'],
    details: () => '',
  },
  {
    id: 'identity',
    label: 'Identity',
    icon: 'i-lucide-id-card',
    fields: [
      { key: 'full_name', label: 'Full name', kind: 'text' },
      { key: 'birth_date', label: 'Date of birth', kind: 'date' },
      { key: 'phone', label: 'Phone', kind: 'phone' },
      { key: 'email', label: 'Email', kind: 'email' },
      { key: 'company', label: 'Company', kind: 'text' },
      { key: 'job_title', label: 'Job title', kind: 'text' },
      NOTES,
    ],
    quickCopy: ['email', 'phone'],
    details: (entry) => join([entry.full_name, entry.email || entry.phone]),
  },
  {
    id: 'address',
    label: 'Address',
    icon: 'i-lucide-map-pin',
    fields: [
      { key: 'country', label: 'Country', kind: 'text' },
      { key: 'region', label: 'Region', kind: 'text' },
      { key: 'city', label: 'City', kind: 'text' },
      { key: 'street', label: 'Street', kind: 'text' },
      { key: 'building', label: 'Building / apartment', kind: 'text' },
      { key: 'postal_code', label: 'Postal code', kind: 'text' },
      NOTES,
    ],
    quickCopy: [],
    details: (entry) => join([entry.city, join([entry.street, entry.building], ' ')], ', '),
  },
]

const TYPES_BY_ID = new Map(ENTRY_TYPES.map((type) => [type.id, type]))

/** Type of an entry (entries without one are logins) */
export function entryType(entry: Values | null | undefined): EntryTypeDef {
  return TYPES_BY_ID.get(entry?.type) ?? TYPES_BY_ID.get(DEFAULT_TYPE)!
}

export function typeById(id: string): EntryTypeDef | undefined {
  return TYPES_BY_ID.get(id)
}

export const CUSTOM_PREFIX = 'custom:'

export function customKey(id: string): string {
  return CUSTOM_PREFIX + id
}

export function isSecretKind(kind: FieldKind): boolean {
  return kind === 'secret' || kind === 'secret_multiline' || kind === 'card_number'
}

/** Fields of an entry: those of its type, then its custom fields (key = storage key) */
export function entryFields(entry: Values, type = entryType(entry)): FieldDef[] {
  const custom: FieldDef[] = (entry.custom ?? []).map((field: CustomField) => ({
    key: customKey(field.id), label: field.label, kind: field.kind,
  }))
  return [...type.fields, ...custom]
}

/** Label and kind of a field key of an entry, also for keys the entry no longer has */
export function describeField(entry: Values, key: string): { label: string; kind: FieldKind } {
  if (key === 'name') return { label: 'Name', kind: 'text' }
  if (key === 'category') return { label: 'Category', kind: 'text' }
  const own = entryFields(entry).find((field) => field.key === key)
  if (own) return own
  for (const type of ENTRY_TYPES) {
    const field = type.fields.find((f) => f.key === key)
    if (field) return field
  }
  return { label: key.startsWith(CUSTOM_PREFIX) ? 'Removed field' : key, kind: 'text' }
}

/** Main secret of an entry ('' when its type has none) */
export function mainSecret(entry: Values): { key: string; label: string; value: string } | null {
  const type = entryType(entry)
  if (!type.secret) return null
  const field = type.fields.find((f) => f.key === type.secret)!
  return { key: field.key, label: field.label, value: entry[field.key] ?? '' }
}

export function entryUrl(entry: Values): string {
  const type = entryType(entry)
  return type.url ? entry[type.url] ?? '' : ''
}

export function formatDate(value: string): string {
  const date = new Date(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const COPY_ICONS: Record<string, string> = {
  login: 'i-lucide-user',
  password: 'i-lucide-key-round',
  email: 'i-lucide-mail',
  phone: 'i-lucide-phone',
  card_number: 'i-lucide-credit-card',
  api_key: 'i-lucide-key-square',
  note: 'i-lucide-notebook-pen',
}

/** Icon of a quick-copy button */
export function copyIcon(key: string): string {
  return COPY_ICONS[key] ?? 'i-lucide-copy'
}

let customCounter = 0

/** New id for a custom field (unique within the entry) */
export function newCustomId(): string {
  return Date.now().toString(36) + (customCounter++).toString(36)
}

/** Custom field kind closest to a type field's kind */
export function toCustomKind(kind: FieldKind): CustomFieldKind {
  switch (kind) {
    case 'secret': case 'card_number': return 'secret'
    case 'month_year': return 'text'
    default: return kind
  }
}
