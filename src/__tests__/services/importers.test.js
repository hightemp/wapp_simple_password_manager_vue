import { describe, it, expect, beforeEach } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { setActivePinia, createPinia } from 'pinia'
import { parseCsv } from '../../services/importers/csv'
import { detectFormat, parseImport, guessCsvMapping } from '../../services/importers'
import { parseOnePasswordData } from '../../services/importers/onePassword'
import { useDatabaseStore } from '../../stores/database'

const file = (name, text) => ({ name, text, bytes: strToU8(text) })
const run = (name, text, mapping) => {
  const f = file(name, text)
  return parseImport(detectFormat(f), f, mapping)
}

describe('CSV parser', () => {
  it('should handle quotes, commas, line breaks, BOM and blank lines', () => {
    const text = '﻿a,b,c\r\n"x, y","say ""hi""","line 1\nline 2"\n\n1,2,3'
    expect(parseCsv(text)).toEqual([['a', 'b', 'c'], ['x, y', 'say "hi"', 'line 1\nline 2'], ['1', '2', '3']])
  })

  it('should detect semicolons as the delimiter', () => {
    expect(parseCsv('name;url\nA;https://a')).toEqual([['name', 'url'], ['A', 'https://a']])
  })
})

describe('format detection', () => {
  it.each([
    ['passwords.csv', 'name,url,username,password,note\n', 'chrome-csv'],
    ['logins.csv', '"url","username","password","httpRealm","formActionOrigin","guid"\n', 'firefox-csv'],
    ['Passwords.csv', 'Title,URL,Username,Password,Notes,OTPAuth\n', 'safari-csv'],
    ['bw.csv', 'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n', 'bitwarden-csv'],
    ['kp.csv', '"Group","Title","Username","Password","URL","Notes","TOTP"\n', 'keepassxc-csv'],
    ['1p.csv', 'Title,Url,Username,Password,OTPAuth,Favorite,Archived,Tags,Notes\n', 'onepassword-csv'],
    ['lp.csv', 'url,username,password,totp,extra,name,grouping,fav\n', 'lastpass-csv'],
    ['other.csv', 'Site,E-mail,Pass\n', 'generic-csv'],
    ['bw.json', '{"encrypted":false,"items":[]}', 'bitwarden-json'],
    ['kp.xml', '<?xml version="1.0"?><KeePassFile></KeePassFile>', 'keepass-xml'],
  ])('%s → %s', (name, text, format) => {
    expect(detectFormat(file(name, text))).toBe(format)
  })

  it('should point to the right import for databases of this app', () => {
    expect(() => detectFormat(file('db.json', '{"table":{"data":[]}}'))).toThrow(/Import database/)
  })
})

describe('importers', () => {
  it('should read browser CSVs, naming entries after the site when needed', async () => {
    const chrome = await run('c.csv', 'name,url,username,password,note\nGitHub,https://github.com,me,p1,work\n,https://www.example.com/login,you,p2,')
    expect(chrome.entries).toEqual([
      { type: 'login', name: 'GitHub', category: '', fields: { login: 'me', password: 'p1', url: 'https://github.com', description: 'work' }, custom: [] },
      { type: 'login', name: 'example.com', category: '', fields: { login: 'you', password: 'p2', url: 'https://www.example.com/login' }, custom: [] },
    ])
    const firefox = await run('f.csv', '"url","username","password","httpRealm","formActionOrigin"\n"https://mail.com","a","b","",""')
    expect(firefox.entries[0]).toMatchObject({ name: 'mail.com', fields: { login: 'a', password: 'b' } })
    const safari = await run('s.csv', 'Title,URL,Username,Password,Notes,OTPAuth\nBank,https://bank,me,pw,,otpauth://totp/x?secret=ABC')
    expect(safari.entries[0].custom).toEqual([{ label: 'TOTP', kind: 'secret', value: 'otpauth://totp/x?secret=ABC' }])
  })

  it('should keep KeePassXC groups without the root and skip the recycle bin', async () => {
    const result = await run('k.csv', [
      '"Group","Title","Username","Password","URL","Notes","TOTP"',
      '"Root/Work/Email","Outlook","me","pw","https://outlook.com","",""',
      '"Root","Top","u","p","","",""',
      '"Root/Recycle Bin","Old","u","p","","",""',
    ].join('\n'))
    expect(result.entries.map((e) => [e.name, e.category])).toEqual([['Outlook', 'Work/Email'], ['Top', '']])
  })

  it('should read Bitwarden CSV logins, notes and custom fields', async () => {
    const result = await run('b.csv', [
      'folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp',
      'Work,,login,Jira,,"Team: core\nRegion: eu",0,https://jira,me,pw,JBSWY3DP',
      ',,note,Wifi codes,secret text,,0,,,,',
    ].join('\n'))
    expect(result.entries[0]).toMatchObject({ type: 'login', category: 'Work', fields: { url: 'https://jira' } })
    expect(result.entries[0].custom.map((c) => c.label)).toEqual(['Team', 'Region', 'TOTP'])
    expect(result.entries[1]).toMatchObject({ type: 'secure_note', fields: { note: 'secret text' } })
  })

  it('should map Bitwarden JSON items to entry types', async () => {
    const data = {
      encrypted: false,
      folders: [{ id: 'f1', name: 'Finance' }],
      items: [
        { type: 1, name: 'Site', folderId: null, login: { username: 'u', password: 'p', totp: 'T', uris: [{ uri: 'https://a' }, { uri: 'https://b' }] }, fields: [{ name: 'PIN', value: '1', type: 1 }] },
        { type: 2, name: 'Note', notes: 'text' },
        { type: 3, name: 'Visa', folderId: 'f1', card: { cardholderName: 'J', number: '4242424242424242', expMonth: '3', expYear: '2027', code: '123' } },
        { type: 4, name: 'Me', identity: { firstName: 'John', lastName: 'Doe', email: 'j@d', city: 'Seattle', address1: 'Pine 1', ssn: '000' } },
        { type: 5, name: 'Key', sshKey: { privateKey: 'PRIV', publicKey: 'PUB', keyFingerprint: 'FP' } },
        { type: 9, name: 'Unknown' },
      ],
    }
    const result = await run('bw.json', JSON.stringify(data))
    expect(result.entries.map((e) => e.type)).toEqual(['login', 'secure_note', 'card', 'identity', 'address', 'server'])
    expect(result.entries[0].custom.map((c) => [c.label, c.kind])).toEqual([['URL 2', 'url'], ['PIN', 'secret'], ['TOTP', 'secret']])
    expect(result.entries[2]).toMatchObject({ category: 'Finance', fields: { card_number: '4242 4242 4242 4242', card_expiry: '03/27', cvv: '123' } })
    expect(result.entries[3].fields.full_name).toBe('John Doe')
    expect(result.entries[4].fields).toMatchObject({ street: 'Pine 1', city: 'Seattle' })
    expect(result.warnings).toHaveLength(1)
    await expect(run('bw.json', '{"encrypted":true,"items":[]}')).rejects.toThrow(/encrypted/)
  })

  it('should read KeePass XML groups, custom strings and skip the recycle bin', async () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<KeePassFile><Meta><RecycleBinUUID>BIN</RecycleBinUUID></Meta><Root><Group><UUID>ROOT</UUID><Name>Database</Name>
  <Entry><String><Key>Title</Key><Value>Top</Value></String><String><Key>Password</Key><Value ProtectInMemory="True">p0</Value></String></Entry>
  <Group><UUID>G1</UUID><Name>Work</Name>
    <Entry>
      <String><Key>Title</Key><Value>Server</Value></String>
      <String><Key>UserName</Key><Value>root</Value></String>
      <String><Key>Password</Key><Value ProtectInMemory="True">pw</Value></String>
      <String><Key>PIN</Key><Value ProtectInMemory="True">1234</Value></String>
      <String><Key>Floor</Key><Value>3</Value></String>
      <History><Entry><String><Key>Title</Key><Value>Old title</Value></String></Entry></History>
    </Entry>
  </Group>
  <Group><UUID>BIN</UUID><Name>Recycle Bin</Name><Entry><String><Key>Title</Key><Value>Deleted</Value></String></Entry></Group>
</Group></Root></KeePassFile>`
    const result = await run('kp.xml', xml)
    expect(result.entries.map((e) => [e.name, e.category])).toEqual([['Top', ''], ['Server', 'Work']])
    expect(result.entries[1].fields).toMatchObject({ login: 'root', password: 'pw' })
    expect(result.entries[1].custom).toEqual([{ label: 'PIN', kind: 'secret', value: '1234' }, { label: 'Floor', kind: 'text', value: '3' }])
  })

  it('should read 1Password items of many types from a 1PUX archive', async () => {
    const data = {
      accounts: [{ vaults: [{ attrs: { name: 'Private' }, items: [
        { categoryUuid: '001', overview: { title: 'GitHub', url: 'https://github.com' }, details: { notesPlain: 'n', loginFields: [{ designation: 'username', value: 'me' }, { designation: 'password', value: 'pw' }], sections: [{ fields: [{ id: 'TOTP_1', title: 'one-time password', value: { totp: 'otpauth://x' } }] }] } },
        { categoryUuid: '002', overview: { title: 'Visa' }, details: { sections: [{ fields: [{ id: 'ccnum', value: { creditCardNumber: '4242424242424242' } }, { id: 'expiry', value: { monthYear: 202712 } }, { id: 'cvv', value: { concealed: '123' } }] }] } },
        { categoryUuid: '003', overview: { title: 'Note' }, details: { notesPlain: 'secret' } },
        { categoryUuid: '109', overview: { title: 'Home' }, details: { sections: [{ fields: [{ id: 'network_name', value: { string: 'HomeNet' } }, { id: 'wireless_password', value: { concealed: 'w' } }] }] } },
        { categoryUuid: '001', state: 'archived', overview: { title: 'Old' }, details: {} },
      ] }] }],
    }
    const archive = zipSync({ 'export.data': strToU8(JSON.stringify(data)) })
    const result = await parseImport('onepassword-1pux', { name: 'x.1pux', text: '', bytes: archive })
    expect(result.entries.map((e) => [e.type, e.name, e.category])).toEqual([
      ['login', 'GitHub', 'Private'], ['card', 'Visa', 'Private'], ['secure_note', 'Note', 'Private'], ['wifi', 'Home', 'Private'],
    ])
    expect(result.entries[0].fields).toMatchObject({ login: 'me', password: 'pw', url: 'https://github.com', description: 'n' })
    expect(result.entries[0].custom).toEqual([{ label: 'TOTP', kind: 'secret', value: 'otpauth://x' }])
    expect(result.entries[1].fields).toMatchObject({ card_number: '4242 4242 4242 4242', card_expiry: '12/27', cvv: '123' })
    expect(result.entries[2].fields).toEqual({ note: 'secret' })
    expect(result.entries[3].fields).toMatchObject({ ssid: 'HomeNet', password: 'w' })
    expect(result.warnings).toHaveLength(1)
    expect(parseOnePasswordData({}).entries).toEqual([])
  })

  it('should read 1Password and LastPass CSVs', async () => {
    const op = await run('1p.csv', 'Title,Url,Username,Password,OTPAuth,Favorite,Archived,Tags,Notes\nA,https://a,u,p,,false,false,"Work,Mail",n\nB,,,,,false,true,,')
    expect(op.entries).toHaveLength(1)
    expect(op.entries[0]).toMatchObject({ name: 'A', category: 'Work' })
    const lp = await run('lp.csv', 'url,username,password,totp,extra,name,grouping,fav\nhttps://a,u,p,,notes,A,Work\\Email,0\nhttp://sn,,,,secret note,N,,0')
    expect(lp.entries.map((e) => [e.type, e.category])).toEqual([['login', 'Work/Email'], ['secure_note', '']])
    expect(lp.entries[1].fields.note).toBe('secret note')
  })

  it('should map columns of any CSV and keep the rest as custom fields', async () => {
    const text = 'Site,E-mail,Pass,Folder,Floor\nBank,me@x,pw,Money,3'
    const guessed = guessCsvMapping(['Site', 'E-mail', 'Pass', 'Folder', 'Floor'])
    expect(guessed).toEqual({ name: 0, login: 1, password: 2, url: -1, notes: -1, category: 3 })
    const result = await run('o.csv', text, guessed)
    expect(result.entries[0]).toEqual({
      type: 'login', name: 'Bank', category: 'Money',
      fields: { login: 'me@x', password: 'pw' },
      custom: [{ label: 'Floor', kind: 'text', value: '3' }],
    })
  })
})

describe('adding imported entries', () => {
  let db
  beforeEach(() => {
    setActivePinia(createPinia())
    db = useDatabaseStore()
    db.setDatabase({ table: { last_index: 1, page: 1, selection_id: null, filter: {}, categories: [], trash: [],
      data: [{ id: 1, name: 'GitHub', login: 'me', password: 'p1', url: 'https://github.com' }] } })
  })

  const imported = (fields, extra = {}) => ({ type: 'login', name: 'GitHub', category: 'Dev', fields, custom: [], ...extra })

  it('should find exact duplicates only', () => {
    const same = imported({ login: 'me', password: 'p1', url: 'https://github.com' })
    const changed = imported({ login: 'me', password: 'p2', url: 'https://github.com' })
    expect([...db.findDuplicates([same, changed])]).toEqual([same])
  })

  it('should add entries under the prefix with custom fields, and undo', () => {
    const ids = db.addImportedEntries([
      imported({ login: 'x', password: 'y' }, { custom: [{ label: 'TOTP', kind: 'secret', value: 'T' }] }),
      { type: 'card', name: 'Visa', category: '', fields: { card_number: '4242' }, custom: [] },
    ], 'Imported/Bitwarden')
    expect(ids).toEqual([2, 3])
    const [login, card] = db.table.data.slice(1)
    expect(login.category).toBe('Imported/Bitwarden/Dev')
    expect(login[`custom:${login.custom[0].id}`]).toBe('T')
    expect(card).toMatchObject({ type: 'card', category: 'Imported/Bitwarden', card_number: '4242' })
    expect(db.unsavedChanges).toBe(1)

    db.discardEntries(ids)
    expect(db.table.data.map((e) => e.id)).toEqual([1])
    expect(db.trash).toEqual([])
  })
})
