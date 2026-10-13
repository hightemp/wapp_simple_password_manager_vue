import { csvRecords } from './csv'
import {
  parseChromeCsv, parseFirefoxCsv, parseSafariCsv, parseKeePassXcCsv, parseBitwardenCsv,
  parseOnePasswordCsv, parseLastPassCsv, parseGenericCsv, guessCsvMapping, type CsvMapping,
} from './csvFormats'
import { parseBitwardenJson } from './bitwarden'
import { parseKeePassXml } from './keepass'
import { parseOnePassword1pux } from './onePassword'
import type { ImportFormat, ImportResult } from './types'

export type { ImportFormat, ImportResult, ImportedEntry } from './types'
export type { CsvMapping } from './csvFormats'
export { guessCsvMapping } from './csvFormats'

export const IMPORT_FORMATS: { id: ImportFormat; label: string; hint: string }[] = [
  { id: 'chrome-csv', label: 'Chrome / Edge / Brave / Opera (CSV)', hint: 'Settings → Passwords → Export passwords' },
  { id: 'firefox-csv', label: 'Firefox (CSV)', hint: 'about:logins → ⋯ → Export logins' },
  { id: 'safari-csv', label: 'Safari / Apple Passwords (CSV)', hint: 'Passwords app → File → Export All Passwords' },
  { id: 'bitwarden-json', label: 'Bitwarden (JSON)', hint: 'Tools → Export vault → File format: .json (not encrypted)' },
  { id: 'bitwarden-csv', label: 'Bitwarden (CSV)', hint: 'Tools → Export vault → File format: .csv' },
  { id: 'keepass-xml', label: 'KeePass 2 (XML)', hint: 'File → Export → KeePass XML (2.x)' },
  { id: 'keepassxc-csv', label: 'KeePassXC (CSV)', hint: 'Database → Export → CSV file' },
  { id: 'onepassword-1pux', label: '1Password (1PUX)', hint: 'File → Export → 1Password Unencrypted Export (.1pux)' },
  { id: 'onepassword-csv', label: '1Password (CSV)', hint: 'File → Export → CSV' },
  { id: 'lastpass-csv', label: 'LastPass (CSV)', hint: 'Advanced options → Export → LastPass CSV file' },
  { id: 'generic-csv', label: 'Other CSV (choose columns)', hint: 'Any CSV file with a header row' },
]

/** A file read for import: text formats as text, 1PUX (zip) as bytes */
export interface ImportFile {
  name: string
  text: string
  bytes: Uint8Array
}

export async function readImportFile(file: File): Promise<ImportFile> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return { name: file.name, bytes, text: new TextDecoder().decode(bytes) }
}

/** Guess the format from the file name and content; throws for files that are not exports */
export function detectFormat(file: ImportFile): ImportFormat {
  const name = file.name.toLowerCase()
  const text = file.text.replace(/^\uFEFF/, '').trimStart()

  if (name.endsWith('.1pux') || (file.bytes[0] === 0x50 && file.bytes[1] === 0x4b)) return 'onepassword-1pux'
  if (text.startsWith('<')) {
    if (text.includes('<KeePassFile')) return 'keepass-xml'
    throw new Error('This XML file is not a KeePass export')
  }
  if (text.startsWith('{')) {
    let data: any
    try {
      data = JSON.parse(text)
    } catch (error) {
      throw new Error('The file is not valid JSON', { cause: error })
    }
    if (data?.table) throw new Error('This is a database of this app — use "Import database" instead')
    if (Array.isArray(data?.items)) return 'bitwarden-json'
    throw new Error('This JSON file is not a supported export')
  }

  const headers = new Set(csvRecords(text.split(/\r?\n/)[0] ?? '').headers.map((h) => h.toLowerCase()))
  if (headers.has('login_uri')) return 'bitwarden-csv'
  if (headers.has('grouping') && headers.has('extra')) return 'lastpass-csv'
  if (headers.has('httprealm') || headers.has('formactionorigin')) return 'firefox-csv'
  if (headers.has('group') && headers.has('title') && headers.has('username')) return 'keepassxc-csv'
  if (headers.has('title') && headers.has('otpauth')) {
    return headers.has('archived') || headers.has('tags') || headers.has('favorite') ? 'onepassword-csv' : 'safari-csv'
  }
  if (['name', 'url', 'username', 'password'].every((h) => headers.has(h))) return 'chrome-csv'
  return 'generic-csv'
}

/** Header row of a CSV file (for choosing columns) */
export function csvHeaders(file: ImportFile): string[] {
  return csvRecords(file.text.split(/\r?\n/)[0] ?? '').headers
}

export async function parseImport(format: ImportFormat, file: ImportFile, mapping?: CsvMapping): Promise<ImportResult> {
  switch (format) {
    case 'chrome-csv': return parseChromeCsv(file.text)
    case 'firefox-csv': return parseFirefoxCsv(file.text)
    case 'safari-csv': return parseSafariCsv(file.text)
    case 'keepassxc-csv': return parseKeePassXcCsv(file.text)
    case 'bitwarden-csv': return parseBitwardenCsv(file.text)
    case 'onepassword-csv': return parseOnePasswordCsv(file.text)
    case 'lastpass-csv': return parseLastPassCsv(file.text)
    case 'generic-csv': return parseGenericCsv(file.text, mapping ?? guessCsvMapping(csvHeaders(file)))
    case 'keepass-xml': return parseKeePassXml(file.text)
    case 'bitwarden-json': {
      let data: unknown
      try {
        data = JSON.parse(file.text.replace(/^\uFEFF/, ''))
      } catch (error) {
        throw new Error('The file is not valid JSON', { cause: error })
      }
      return parseBitwardenJson(data)
    }
    case 'onepassword-1pux': return parseOnePassword1pux(file.bytes)
  }
}
