/**
 * RFC 4180 CSV: quoted fields with commas, quotes ("") and line breaks; a BOM and
 * either "," or ";" as the delimiter (guessed from the header line).
 */
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, '')
  const firstLine = source.slice(0, source.search(/\r?\n|$/))
  const delimiter = count(firstLine, ';') > count(firstLine, ',') ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"' && field === '') {
      quoted = true
    } else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  // Drop blank lines
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function count(text: string, char: string): number {
  return text.split(char).length - 1
}

/** Rows as objects keyed by lower-cased header names */
export function csvRecords(text: string): { headers: string[]; records: Record<string, string>[] } {
  const [header = [], ...rows] = parseCsv(text)
  const headers = header.map((name) => name.trim())
  const keys = headers.map((name) => name.toLowerCase())
  const records = rows.map((row) => Object.fromEntries(keys.map((key, i) => [key, row[i] ?? ''])))
  return { headers, records }
}
