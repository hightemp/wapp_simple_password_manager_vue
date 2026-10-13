import { describe, it, expect } from 'vitest'
import { entryType, entryFields, describeField, mainSecret, entryUrl, ENTRY_TYPES } from '../../types/entryTypes'

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
})
