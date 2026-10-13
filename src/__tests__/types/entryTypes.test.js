import { describe, it, expect } from 'vitest'
import { entryType, entryFields, describeField, mainSecret, entryUrl, ENTRY_TYPES, wifiQrText, sshCommand, isSecretKind, connectionString, bankDetails, expiryDate, expiryStatus } from '../../types/entryTypes'

describe('entry types', () => {
  it('should treat entries without a type as logins', () => {
    expect(entryType({}).id).toBe('login')
    expect(entryType({ type: 'unknown' }).id).toBe('login')
  })

  it('should have unique ids and field keys per type', () => {
    expect(new Set(ENTRY_TYPES.map((t) => t.id)).size).toBe(ENTRY_TYPES.length)
    for (const type of ENTRY_TYPES) {
      expect(new Set(type.fields.map((f) => f.key)).size).toBe(type.fields.length)
      if (type.secret) expect(type.fields.some((f) => f.key === type.secret)).toBe(true)
    }
  })

  it('should summarize entries for the Details column', () => {
    expect(entryType({}).details({ login: 'john' })).toBe('john')
    expect(entryType({ type: 'card' }).details({ card_number: '4242 4242 4242 4242', card_expiry: '12/27' })).toBe('Visa •••• 4242 · 12/27')
    expect(entryType({ type: 'api_key' }).details({ environment: 'prod' })).toBe('prod')
    expect(entryType({ type: 'address' }).details({ city: 'Moscow', street: 'Tverskaya', building: '1' })).toBe('Moscow, Tverskaya 1')
    expect(entryType({ type: 'identity' }).details({ full_name: 'John Doe', phone: '+1 555' })).toBe('John Doe · +1 555')
  })

  it('should list custom fields after the type fields', () => {
    const entry = { type: 'secure_note', custom: [{ id: 'a', label: 'PIN', kind: 'secret' }] }
    expect(entryFields(entry).map((f) => f.key)).toEqual(['note', 'custom:a'])
    expect(describeField(entry, 'custom:a')).toMatchObject({ label: 'PIN', kind: 'secret' })
    expect(describeField(entry, 'custom:gone').label).toBe('Removed field')
    // A field of another type (kept in the history after a type change)
    expect(describeField(entry, 'password')).toMatchObject({ label: 'Password', kind: 'secret' })
  })

  it('should give the main secret and URL', () => {
    expect(mainSecret({ password: 'p' })).toEqual({ key: 'password', label: 'Password', value: 'p' })
    expect(mainSecret({ type: 'address' })).toBeNull()
    expect(entryUrl({ type: 'api_key', url: 'https://console' })).toBe('https://console')
    expect(entryUrl({ type: 'card', url: 'x' })).toBe('')
  })

  it('should build Wi-Fi QR texts with escaping', () => {
    expect(wifiQrText({ ssid: 'Home;Net', password: 'p:a"ss', security: 'WPA/WPA2/WPA3', hidden: 'No' }))
      .toBe('WIFI:T:WPA;S:Home\\;Net;P:p\\:a\\"ss;;')
    expect(wifiQrText({ ssid: 'Cafe', security: 'None', hidden: 'Yes' })).toBe('WIFI:T:nopass;S:Cafe;H:true;;')
  })

  it('should treat every secret kind as masked', () => {
    expect(['secret', 'secret_multiline', 'card_number', 'codes'].every(isSecretKind)).toBe(true)
    expect(isSecretKind('text')).toBe(false)
  })

  it('should build ssh commands', () => {
    expect(sshCommand({ host: 'example.com' })).toBe('ssh example.com')
    expect(sshCommand({ host: 'example.com', login: 'root', port: '22' })).toBe('ssh root@example.com')
    expect(sshCommand({ host: '10.0.0.1', login: 'deploy', port: '2222' })).toBe('ssh -p 2222 deploy@10.0.0.1')
  })

  it('should summarize stage 2 types and offer their actions', () => {
    expect(entryType({ type: 'server' }).details({ host: 'h', login: 'u', port: '22' })).toBe('u@h:22')
    expect(entryType({ type: 'recovery_codes' }).details({ codes: 'a\n✓ b\nc' })).toBe('2 of 3 unused')
    expect(entryType({ type: 'wifi' }).details({ ssid: 'Home', security: 'WEP' })).toBe('Home · WEP')
    const address = entryType({ type: 'address' }).actions[0]
    expect(address.copy({ street: 'Pine St', building: '12', city: 'Seattle', postal_code: '98101', country: 'USA' }))
      .toBe('Pine St 12, Seattle, 98101, USA')
    expect(address.available({})).toBe(false)
  })

  it('should build database connection strings', () => {
    expect(connectionString({ db_kind: 'PostgreSQL', host: 'db.local', port: '5432', database: 'app', login: 'admin', password: 'p@ss:word' }))
      .toBe('postgresql://admin:p%40ss%3Aword@db.local:5432/app')
    expect(connectionString({ db_kind: 'Redis', host: 'cache' })).toBe('redis://cache')
  })

  it('should copy bank details as labelled lines', () => {
    expect(bankDetails({ bank: 'Chase', account_number: 'DE89 3704', bic: 'CHASUS33', description: 'skip' }))
      .toBe('Bank: Chase\nAccount / IBAN: DE89 3704\nBIC / SWIFT: CHASUS33')
    expect(entryType({ type: 'bank_account' }).details({ bank: 'Chase', account_number: 'DE89 3704 0044' })).toBe('Chase · •••• 0044')
  })

  it('should never show the seed phrase of a wallet in the list', () => {
    const wallet = { type: 'crypto_wallet', seed_phrase: 'abandon abandon', password: '1234', address: '0x1234567890abcdef1234' }
    expect(mainSecret(wallet).key).toBe('password')
    expect(entryType(wallet).details({ ...wallet, network: 'Ethereum' })).toBe('Ethereum · 0x1234…1234')
  })

  it('should read expiry dates and report expiring entries', () => {
    const now = new Date(2026, 9, 13)
    expect(expiryDate({ type: 'card', card_expiry: '02/28' })).toEqual(new Date(2028, 1, 29))
    expect(expiryDate({ type: 'login', expires: '2026-10-20' })).toBeNull()
    expect(expiryStatus({ type: 'api_key', expires: '2026-10-20' }, now)).toBe('soon')
    expect(expiryStatus({ type: 'document', expiry_date: '2026-10-12' }, now)).toBe('expired')
    expect(expiryStatus({ type: 'license', expires: '2026-12-31' }, now)).toBeNull()
    expect(expiryStatus({ type: 'card', card_expiry: '10/26' }, now)).toBe('soon')
    expect(expiryStatus({ type: 'card', card_expiry: '13/26' }, now)).toBeNull()
  })
})
