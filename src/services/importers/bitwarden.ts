import { formatCardNumber } from '@/utils/card'
import { entry, totpField, type ImportedEntry, type ImportResult } from './types'

// Bitwarden item types
const LOGIN = 1
const SECURE_NOTE = 2
const CARD = 3
const IDENTITY = 4
const SSH_KEY = 5

// Custom field types: text, hidden, boolean, linked
const HIDDEN = 1
const LINKED = 3

/** Bitwarden unencrypted JSON export */
export function parseBitwardenJson(data: any): ImportResult {
  if (data?.encrypted) {
    throw new Error('This Bitwarden export is encrypted. Export again as "JSON" (not "JSON (Encrypted)").')
  }
  if (!Array.isArray(data?.items)) throw new Error('Not a Bitwarden export (no "items")')

  const folders = new Map<string, string>((data.folders ?? []).map((folder: any) => [folder.id, folder.name ?? '']))
  const entries: ImportedEntry[] = []
  const unknown = new Set<number>()

  for (const item of data.items) {
    const category = folders.get(item.folderId) ?? ''
    const notes = item.notes ?? ''
    const custom: ImportedEntry['custom'] = (item.fields ?? [])
      .filter((field: any) => field.type !== LINKED)
      .map((field: any) => ({
        label: field.name || 'Field',
        kind: field.type === HIDDEN ? 'secret' as const : 'text' as const,
        value: field.value ?? '',
      }))

    switch (item.type) {
      case LOGIN: {
        const login = item.login ?? {}
        const [first, ...more] = (login.uris ?? []).map((uri: any) => uri.uri).filter(Boolean)
        const extraUrls = more.map((url: string, i: number) => ({ label: `URL ${i + 2}`, kind: 'url' as const, value: url }))
        entries.push(entry('login', item.name, {
          login: login.username, password: login.password, url: first, description: notes,
        }, { category, custom: [...extraUrls, ...custom, ...totpField(login.totp)] }))
        break
      }
      case SECURE_NOTE:
        entries.push(entry('secure_note', item.name, { note: notes }, { category, custom }))
        break
      case CARD: {
        const card = item.card ?? {}
        const month = String(card.expMonth ?? '').padStart(2, '0')
        const year = String(card.expYear ?? '').slice(-2)
        entries.push(entry('card', item.name, {
          cardholder: card.cardholderName,
          card_number: card.number ? formatCardNumber(card.number) : '',
          card_expiry: card.expMonth && card.expYear ? `${month}/${year}` : '',
          cvv: card.code,
          description: notes,
        }, { category, custom }))
        break
      }
      case IDENTITY:
        entries.push(...identityEntries(item, category, notes, custom))
        break
      case SSH_KEY: {
        const key = item.sshKey ?? {}
        entries.push(entry('server', item.name, { private_key: key.privateKey, description: notes }, {
          category,
          custom: [
            { label: 'Public key', kind: 'multiline', value: key.publicKey ?? '' },
            { label: 'Fingerprint', kind: 'text', value: key.keyFingerprint ?? '' },
            ...custom,
          ],
        }))
        break
      }
      default:
        unknown.add(item.type)
    }
  }

  const warnings = unknown.size ? [`Items of unknown type ${[...unknown].join(', ')} were skipped`] : []
  return { source: 'Bitwarden', entries, warnings }
}

/** An identity, plus an Address entry when it has an address */
function identityEntries(item: any, category: string, notes: string, custom: ImportedEntry['custom']): ImportedEntry[] {
  const id = item.identity ?? {}
  const fullName = [id.title, id.firstName, id.middleName, id.lastName].filter(Boolean).join(' ')
  const result = [entry('identity', item.name, {
    full_name: fullName, phone: id.phone, email: id.email, company: id.company, description: notes,
  }, {
    category,
    custom: [
      { label: 'Username', kind: 'text', value: id.username ?? '' },
      { label: 'SSN', kind: 'secret', value: id.ssn ?? '' },
      { label: 'Passport number', kind: 'secret', value: id.passportNumber ?? '' },
      { label: 'License number', kind: 'secret', value: id.licenseNumber ?? '' },
      ...custom,
    ],
  })]
  const street = [id.address1, id.address2, id.address3].filter(Boolean).join(', ')
  if (street || id.city || id.country) {
    result.push(entry('address', `${item.name} — address`, {
      street, city: id.city, region: id.state, postal_code: id.postalCode, country: id.country,
    }, { category }))
  }
  return result
}
