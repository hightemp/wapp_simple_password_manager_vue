import { csvRecords } from './csv'
import { entry, hostName, totpField, type ImportedEntry, type ImportResult } from './types'

type Row = Record<string, string>

/** First non-empty value among columns (header names are lower-case) */
function pick(row: Row, ...columns: string[]): string {
  for (const column of columns) {
    const value = row[column]
    if (value?.trim()) return value
  }
  return ''
}

function loginEntry(row: Row, columns: { name: string[]; login: string[]; password: string[]; url: string[]; notes: string[] }, category = '', custom: ImportedEntry['custom'] = []) {
  const url = pick(row, ...columns.url)
  return entry('login', pick(row, ...columns.name) || hostName(url), {
    login: pick(row, ...columns.login),
    password: pick(row, ...columns.password),
    url,
    description: pick(row, ...columns.notes),
  }, { category, custom })
}

function result(source: string, rows: Row[], toEntry: (row: Row) => ImportedEntry | null): ImportResult {
  const entries: ImportedEntry[] = []
  let skipped = 0
  for (const row of rows) {
    const item = toEntry(row)
    if (item) entries.push(item)
    else skipped++
  }
  return { source, entries, warnings: skipped ? [`${skipped} empty rows were skipped`] : [] }
}

const isEmpty = (row: Row) => Object.values(row).every((value) => !value.trim())

/** Chrome, Edge, Brave, Opera: name,url,username,password,note */
export function parseChromeCsv(text: string): ImportResult {
  return result('Browser', csvRecords(text).records, (row) => isEmpty(row) ? null : loginEntry(row, {
    name: ['name'], login: ['username'], password: ['password'], url: ['url'], notes: ['note', 'notes'],
  }))
}

/** Firefox: url,username,password,httpRealm,formActionOrigin,guid,… */
export function parseFirefoxCsv(text: string): ImportResult {
  return result('Firefox', csvRecords(text).records, (row) => isEmpty(row) ? null : loginEntry(row, {
    name: [], login: ['username'], password: ['password'], url: ['url'], notes: [],
  }))
}

/** Safari / Apple Passwords: Title,URL,Username,Password,Notes,OTPAuth */
export function parseSafariCsv(text: string): ImportResult {
  return result('Safari', csvRecords(text).records, (row) => isEmpty(row) ? null : loginEntry(row, {
    name: ['title'], login: ['username'], password: ['password'], url: ['url'], notes: ['notes'],
  }, '', totpField(row.otpauth)))
}

/** KeePassXC: "Group","Title","Username","Password","URL","Notes","TOTP",… */
export function parseKeePassXcCsv(text: string): ImportResult {
  return result('KeePass', csvRecords(text).records, (row) => {
    if (isEmpty(row)) return null
    // The path starts with the database's root group ("Root/Work/Email")
    const category = (row.group ?? '').split('/').slice(1).join('/')
    if (category.split('/')[0] === 'Recycle Bin') return null
    return loginEntry(row, {
      name: ['title'], login: ['username'], password: ['password'], url: ['url'], notes: ['notes'],
    }, category, totpField(row.totp))
  })
}

/** Bitwarden CSV: folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp */
export function parseBitwardenCsv(text: string): ImportResult {
  return result('Bitwarden', csvRecords(text).records, (row) => {
    if (isEmpty(row)) return null
    // Custom fields: one "name: value" per line
    const custom: ImportedEntry['custom'] = (row.fields ?? '').split(/\r?\n/)
      .map((line) => line.match(/^([^:]+):\s?(.*)$/))
      .filter((match): match is RegExpMatchArray => Boolean(match))
      .map((match) => ({ label: match[1].trim(), kind: 'text' as const, value: match[2] }))
    if (row.type === 'note') {
      return entry('secure_note', row.name, { note: row.notes }, { category: row.folder, custom })
    }
    return loginEntry(row, {
      name: ['name'], login: ['login_username'], password: ['login_password'], url: ['login_uri'], notes: ['notes'],
    }, row.folder, [...custom, ...totpField(row.login_totp)])
  })
}

/** 1Password CSV: Title,Url,Username,Password,OTPAuth,Favorite,Archived,Tags,Notes */
export function parseOnePasswordCsv(text: string): ImportResult {
  let archived = 0
  const parsed = result('1Password', csvRecords(text).records, (row) => {
    if (isEmpty(row)) return null
    if (row.archived?.toLowerCase() === 'true') {
      archived++
      return null
    }
    const category = (row.tags ?? '').split(/[,;]/)[0].trim()
    return loginEntry(row, {
      name: ['title'], login: ['username'], password: ['password'], url: ['url', 'website'], notes: ['notes', 'notesplain'],
    }, category, totpField(pick(row, 'otpauth', 'one-time password')))
  })
  if (archived) parsed.warnings = [`${archived} archived items were skipped`]
  return parsed
}

/** LastPass: url,username,password,totp,extra,name,grouping,fav — "http://sn" rows are secure notes */
export function parseLastPassCsv(text: string): ImportResult {
  return result('LastPass', csvRecords(text).records, (row) => {
    if (isEmpty(row)) return null
    const category = (row.grouping ?? '').replace(/\\/g, '/')
    if (row.url === 'http://sn') {
      return entry('secure_note', row.name, { note: row.extra }, { category })
    }
    return loginEntry(row, {
      name: ['name'], login: ['username'], password: ['password'], url: ['url'], notes: ['extra'],
    }, category, totpField(row.totp))
  })
}

/** Which column holds each value (index into the CSV header; -1 = none) */
export interface CsvMapping {
  name: number
  login: number
  password: number
  url: number
  notes: number
  category: number
}

const GUESSES: Record<keyof CsvMapping, RegExp> = {
  name: /^(name|title|account|site|service|entry)$/i,
  login: /^(user ?name|login|user|email|e-mail|account name)$/i,
  password: /^(password|pass|pwd|secret)$/i,
  url: /^(url|uri|website|web site|address|link|login_uri)$/i,
  notes: /^(notes?|comments?|description|extra)$/i,
  category: /^(category|folder|group|grouping|tags?|path)$/i,
}

/** Mapping guessed from header names */
export function guessCsvMapping(headers: string[]): CsvMapping {
  const mapping = {} as CsvMapping
  for (const [key, pattern] of Object.entries(GUESSES) as [keyof CsvMapping, RegExp][]) {
    mapping[key] = headers.findIndex((header) => pattern.test(header.trim()))
  }
  return mapping
}

/** Any CSV with a header row, using a column mapping chosen by the user */
export function parseGenericCsv(text: string, mapping: CsvMapping): ImportResult {
  const { headers, records } = csvRecords(text)
  const keys = headers.map((header) => header.toLowerCase())
  const value = (row: Row, index: number) => (index >= 0 ? row[keys[index]] ?? '' : '')
  const mapped = new Set(Object.values(mapping))
  return result('CSV', records, (row) => {
    if (isEmpty(row)) return null
    const url = value(row, mapping.url)
    // Columns that are not mapped are kept as custom fields
    const custom = headers
      .map((header, index) => ({ label: header, kind: 'text' as const, value: mapped.has(index) ? '' : value(row, index) }))
    return entry('login', value(row, mapping.name) || hostName(url), {
      login: value(row, mapping.login),
      password: value(row, mapping.password),
      url,
      description: value(row, mapping.notes),
    }, { category: value(row, mapping.category).replace(/\\/g, '/'), custom })
  })
}
