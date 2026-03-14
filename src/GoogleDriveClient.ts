// Google Drive client — GIS + fetch to Drive REST API v3
// No gapi, no npm SDK. Uses appDataFolder scope only.

// === GIS type declarations ===
declare const google: {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string
        scope: string
        callback: (resp: GTokenResponse) => void
        error_callback?: (err: { type: string; message: string }) => void
      }): GTokenClient
    }
  }
}

export interface GTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
  scope: string
  error?: string
  error_description?: string
}

export interface GTokenClient {
  requestAccessToken(opts?: { prompt?: string }): void
}

export interface GoogleDriveFile {
  id: string
  name?: string
  modifiedTime?: string
}

// === Module-level state ===
let gAccessToken: string | null = null
let gTokenExpiresAt = 0

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'

// === GIS Script Loader ===
export function loadGisScript(): Promise<void> {
  if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(s)
  })
}

// === Token Management ===
export function requestToken(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp: GTokenResponse) => {
        if (resp.error) {
          reject(new Error(resp.error_description ?? resp.error))
          return
        }
        gAccessToken = resp.access_token
        gTokenExpiresAt = Date.now() + resp.expires_in * 1000
        resolve(gAccessToken)
      },
      error_callback: (err) => reject(new Error(err.message)),
    })
    tokenClient.requestAccessToken()
  })
}

export async function ensureToken(clientId: string): Promise<string> {
  // Reuse token if still valid (with 5-min buffer)
  if (gAccessToken && Date.now() < gTokenExpiresAt - 300_000) {
    return gAccessToken
  }
  await loadGisScript()
  return requestToken(clientId)
}

// === Drive API helpers ===

export async function findFile(
  token: string,
  fileName: string,
  clientId?: string,
): Promise<string | null> {
  const q = encodeURIComponent(`name='${fileName}'`)
  let res = await fetch(
    `${DRIVE_API}?spaces=appDataFolder&q=${q}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  // Auto-retry on 401
  if (res.status === 401 && clientId) {
    gAccessToken = null
    const newToken = await ensureToken(clientId)
    res = await fetch(
      `${DRIVE_API}?spaces=appDataFolder&q=${q}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${newToken}` } },
    )
  }
  if (!res.ok) throw new Error(`Drive list: ${res.status}`)
  const { files } = await res.json()
  return files.length > 0 ? files[0].id : null
}

export async function readFile(token: string, fileId: string): Promise<string> {
  const res = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Drive read: ${res.status}`)
  return res.text()
}

export async function createFile(
  token: string,
  fileName: string,
  content: string,
): Promise<string> {
  const boundary = '---boundary' + Date.now()
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: fileName, parents: ['appDataFolder'] }) +
    `\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n` +
    content +
    `\r\n--${boundary}--`

  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  if (!res.ok) throw new Error(`Drive create: ${res.status}`)
  const data = await res.json()
  return data.id
}

export async function updateFile(
  token: string,
  fileId: string,
  content: string,
): Promise<void> {
  const res = await fetch(`${DRIVE_UPLOAD}/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: content,
  })
  if (!res.ok) throw new Error(`Drive update: ${res.status}`)
}
