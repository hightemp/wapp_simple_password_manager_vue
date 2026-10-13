import { entry, totpField, type ImportedEntry, type ImportResult } from './types'

// Standard KeePass strings; everything else becomes a custom field
const STANDARD = new Set(['Title', 'UserName', 'Password', 'URL', 'Notes', 'otp', 'TOTP Seed', 'TOTP Settings'])

/** KeePass 2 XML export (File → Export → KeePass XML) */
export function parseKeePassXml(text: string): ImportResult {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror') || !doc.querySelector('KeePassFile')) {
    throw new Error('Not a KeePass XML export')
  }
  const recycleBin = childText(doc.querySelector('KeePassFile > Meta'), 'RecycleBinUUID')
  const root = doc.querySelector('KeePassFile > Root > Group')
  const entries: ImportedEntry[] = []
  let protectedWithoutValue = 0

  function walk(group: Element, path: string[]) {
    for (const node of Array.from(group.children)) {
      if (node.tagName === 'Group') {
        if (recycleBin && childText(node, 'UUID') === recycleBin) continue
        walk(node, [...path, childText(node, 'Name')])
      } else if (node.tagName === 'Entry') {
        const strings = new Map<string, { value: string; secret: boolean }>()
        for (const item of Array.from(node.children).filter((child) => child.tagName === 'String')) {
          const valueNode = item.querySelector('Value')
          const secret = valueNode?.getAttribute('Protected') === 'True' || valueNode?.getAttribute('ProtectInMemory') === 'True'
          // Values protected with the database's stream cipher can't be read from the XML
          if (valueNode?.getAttribute('Protected') === 'True') protectedWithoutValue++
          strings.set(childText(item, 'Key'), { value: valueNode?.textContent ?? '', secret })
        }
        const get = (key: string) => strings.get(key)?.value ?? ''
        const custom: ImportedEntry['custom'] = [...strings]
          .filter(([key]) => !STANDARD.has(key))
          .map(([key, { value, secret }]) => ({ label: key, kind: secret ? 'secret' as const : 'text' as const, value }))
        entries.push(entry('login', get('Title'), {
          login: get('UserName'), password: get('Password'), url: get('URL'), description: get('Notes'),
        }, { category: path.filter(Boolean).join('/'), custom: [...custom, ...totpField(get('otp') || get('TOTP Seed'))] }))
      }
    }
  }

  // The root group itself is the database — its name is not a category
  if (root) walk(root, [])
  const warnings = protectedWithoutValue
    ? ['Some values were encrypted inside the XML (protected). Export again from KeePass 2 with "KeePass XML (2.x)" — it writes them in plain text.']
    : []
  return { source: 'KeePass', entries, warnings }
}

function childText(parent: Element | null, tag: string): string {
  if (!parent) return ''
  const child = Array.from(parent.children).find((node) => node.tagName === tag)
  return child?.textContent ?? ''
}
