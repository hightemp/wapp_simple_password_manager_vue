import { formatCardNumber } from '@/utils/card'
import type { CustomFieldKind } from '@/types/entryTypes'
import { entry, totpField, type ImportedEntry, type ImportResult } from './types'

/** A field of a 1Password item, flattened from its sections */
interface Field {
  id: string
  title: string
  value: string
  kind: CustomFieldKind
  // 1Password value type (concealed, totp, email, …)
  valueType: string
}

// 1Password category ids → our type, and which 1Password field ids fill which of our fields
const CATEGORIES: Record<string, { type: string; map: Record<string, string> }> = {
  '001': { type: 'login', map: {} },
  '002': { type: 'card', map: { cardholder: 'cardholder', ccnum: 'card_number', expiry: 'card_expiry', cvv: 'cvv', pin: 'pin', bank: 'bank', phoneLocal: 'bank_phone', phoneTollFree: 'bank_phone' } },
  '003': { type: 'secure_note', map: {} },
  '004': { type: 'identity', map: { firstname: 'full_name', birthdate: 'birth_date', defphone: 'phone', cellphone: 'phone', email: 'email', company: 'company', jobtitle: 'job_title' } },
  '005': { type: 'login', map: {} },
  '100': { type: 'license', map: { reg_code: 'license_key', reg_name: 'licensed_to', reg_email: 'email', product_version: 'version', order_date: 'purchase_date', expiry_date: 'expires', download_link: 'url' } },
  '101': { type: 'bank_account', map: { bankName: 'bank', owner: 'account_holder', accountNo: 'account_number', iban: 'account_number', swift: 'bic', routingNo: 'corr_account' } },
  '102': { type: 'database', map: { database_type: 'db_kind', hostname: 'host', port: 'port', database: 'database', username: 'login', password: 'password' } },
  '103': { type: 'document', map: { number: 'doc_number', fullname: 'holder', state: 'issued_by', expiry_date: 'expiry_date' } },
  '106': { type: 'document', map: { number: 'doc_number', fullname: 'holder', issuing_authority: 'issued_by', issue_date: 'issue_date', expiry_date: 'expiry_date' } },
  '108': { type: 'document', map: { number: 'doc_number', name: 'holder' } },
  '109': { type: 'wifi', map: { network_name: 'ssid', wireless_password: 'password', wireless_security: 'security' } },
  '110': { type: 'server', map: { url: 'host', username: 'login', password: 'password' } },
  '111': { type: 'login', map: { pop_username: 'login', pop_password: 'password', pop_server: 'url' } },
  '112': { type: 'api_key', map: { credential: 'api_key', type: 'environment', expires: 'expires', hostname: 'url' } },
  '114': { type: 'server', map: { private_key: 'private_key' } },
  '115': { type: 'crypto_wallet', map: { recoveryPhrase: 'seed_phrase', password: 'password', walletAddress: 'address' } },
}

const DOCUMENT_KINDS: Record<string, string> = { '103': "Driver's license", '106': 'Passport', '108': 'Tax ID' }

/** 1Password export (.1pux = zip with export.data) */
export async function parseOnePassword1pux(bytes: Uint8Array): Promise<ImportResult> {
  // Loaded only when a 1PUX file is imported
  const { unzipSync, strFromU8 } = await import('fflate')
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes, { filter: (file) => file.name === 'export.data' })
  } catch (error) {
    throw new Error('The .1pux file could not be opened (not a zip archive)', { cause: error })
  }
  if (!files['export.data']) throw new Error('Not a 1Password export (export.data is missing)')
  return parseOnePasswordData(JSON.parse(strFromU8(files['export.data'])))
}

export function parseOnePasswordData(data: any): ImportResult {
  const entries: ImportedEntry[] = []
  let skipped = 0
  for (const account of data?.accounts ?? []) {
    for (const vault of account.vaults ?? []) {
      const category = vault.attrs?.name ?? ''
      for (const item of vault.items ?? []) {
        if (item.state === 'archived' || item.trashed) {
          skipped++
          continue
        }
        entries.push(convertItem(item, category))
      }
    }
  }
  return {
    source: '1Password',
    entries,
    warnings: skipped ? [`${skipped} archived or deleted items were skipped`] : [],
  }
}

function convertItem(item: any, category: string): ImportedEntry {
  const overview = item.overview ?? {}
  const details = item.details ?? {}
  const known = CATEGORIES[item.categoryUuid] ?? { type: 'secure_note', map: {} }
  const fields: Record<string, string> = { description: details.notesPlain ?? '' }
  const custom: ImportedEntry['custom'] = []

  // Login fields of web logins
  for (const field of details.loginFields ?? []) {
    if (field.designation === 'username') fields.login ??= field.value
    if (field.designation === 'password') fields.password ??= field.value
  }
  if (known.type === 'login') {
    fields.url = overview.url ?? ''
    fields.password ||= details.password ?? ''
  }
  if (DOCUMENT_KINDS[item.categoryUuid]) fields.doc_kind = DOCUMENT_KINDS[item.categoryUuid]

  for (const field of sectionFields(details.sections ?? [])) {
    const target = known.map[field.id]
    if (field.id === 'lastname' && fields.full_name) {
      fields.full_name += ' ' + field.value
    } else if (field.valueType === 'totp') {
      custom.push(...totpField(field.value))
    } else if (target && !fields[target]) {
      fields[target] = target === 'card_number' ? formatCardNumber(field.value) : field.value
    } else if (field.value) {
      custom.push({ label: field.title || field.id, kind: field.kind, value: field.value })
    }
  }
  if (known.type === 'secure_note') {
    fields.note = fields.description
    delete fields.description
  }
  return entry(known.type, overview.title, fields, { category, custom })
}

function sectionFields(sections: any[]): Field[] {
  const result: Field[] = []
  for (const section of sections) {
    for (const field of section.fields ?? []) {
      const parsed = fieldValue(field.value ?? {})
      const valueType = Object.keys(field.value ?? {})[0] ?? ''
      if (parsed) result.push({ id: field.id ?? '', title: field.title ?? '', valueType, ...parsed })
    }
  }
  return result
}

/** The value of a 1Password field and the closest custom field kind */
function fieldValue(value: Record<string, any>): { value: string; kind: CustomFieldKind } | null {
  const [type, raw] = Object.entries(value)[0] ?? []
  if (raw == null || raw === '') return null
  switch (type) {
    case 'concealed': case 'creditCardNumber': case 'totp': return { value: String(raw), kind: 'secret' }
    case 'email': return { value: typeof raw === 'object' ? raw.email_address ?? '' : String(raw), kind: 'email' }
    case 'phone': return { value: String(raw), kind: 'phone' }
    case 'url': return { value: String(raw), kind: 'url' }
    case 'date': return { value: new Date(Number(raw) * 1000).toISOString().slice(0, 10), kind: 'date' }
    case 'monthYear': {
      // 202712 → 12/27
      const text = String(raw)
      return { value: `${text.slice(4, 6)}/${text.slice(2, 4)}`, kind: 'text' }
    }
    case 'address': {
      const parts = [raw.street, raw.city, raw.state, raw.zip, raw.country].filter(Boolean)
      return parts.length ? { value: parts.join(', '), kind: 'text' } : null
    }
    case 'sshKey': return { value: raw.privateKey ?? '', kind: 'secret_multiline' }
    default: return typeof raw === 'object' ? null : { value: String(raw), kind: 'text' }
  }
}
