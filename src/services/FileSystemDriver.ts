import { Octokit } from '@octokit/rest'
import { createClient, WebDAVClient } from 'webdav/web'
import { encode, decode } from 'js-base64'
import { encrypt, decrypt, DecryptionError } from '@/utils/crypto'
import * as googleDrive from './googleDrive'

export type RepoType = 'localstorage' | 'github' | 'webdav' | 'googledrive'

export interface RepoItem {
  type: RepoType
  name: string
  login?: string
  repo?: string
  key?: string
  url?: string
  username?: string
  password?: string
  gdrive_client_id?: string
}

export interface ReadResult {
  data: string
  // Version of the file: GitHub blob SHA, Google Drive file version, or a content hash
  version: string
}

export interface WriteOptions {
  // Write even if the file changed since this session read or wrote it
  force?: boolean
}

/** The requested file does not exist in the repo */
export class NotFoundError extends Error {
  constructor(path: string, options?: ErrorOptions) {
    super(`Not Found: ${path}`, options)
    this.name = 'NotFoundError'
  }
}

/** The file was changed elsewhere since this session read or wrote it */
export class ConflictError extends Error {
  constructor(path: string, options?: ErrorOptions) {
    super(`The file was changed elsewhere: ${path}`, options)
    this.name = 'ConflictError'
  }
}

/** The storage rejected the credentials or denied access; the message says what to fix */
export class AuthError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AuthError'
  }
}

/** HTTP status of an error thrown by Octokit, the WebDAV client or the Drive client */
export function httpStatus(error: any): number | undefined {
  return error?.status ?? error?.response?.status
}

/** Convert HTTP 404 errors from GitHub / WebDAV clients into NotFoundError */
function rethrowNotFound(error: any, path: string): never {
  if (httpStatus(error) === 404) {
    throw new NotFoundError(path, { cause: error })
  }
  throw error
}

/**
 * Turn "access denied" HTTP errors into an AuthError with a hint for the repo type.
 * Other errors are returned unchanged.
 */
export function describeAccessError(error: unknown, repo: RepoItem): unknown {
  const status = httpStatus(error)
  const message = error instanceof Error ? error.message : String(error)
  if (repo.type === 'github') {
    if (status === 401) {
      return new AuthError('GitHub rejected the access token: it is invalid, expired or revoked. Create a new token and update the repository settings.', { cause: error })
    }
    if (status === 403 && /rate limit/i.test(message)) {
      return new AuthError('GitHub API rate limit exceeded. Try again later.', { cause: error })
    }
    if (status === 403) {
      return new AuthError(`The GitHub token has no access to "${repo.login}/${repo.repo}". It needs the "Contents: read and write" permission.`, { cause: error })
    }
  }
  if (repo.type === 'webdav' && (status === 401 || status === 403)) {
    return new AuthError('The WebDAV server rejected the username or password (or the account has no access to this folder).', { cause: error })
  }
  if (repo.type === 'googledrive' && (status === 401 || status === 403)) {
    return new AuthError('Google Drive denied access. Sign in again, and check the OAuth client ID in the repository settings.', { cause: error })
  }
  return error
}

/** Short non-cryptographic hash (cyrb53) — detects that a file's content changed */
export function contentHash(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

function trimLeadingSlashes(path: string): string {
  return path.replace(/^\/+/, '')
}

/**
 * Uniform read/write/delete API over all supported storage backends.
 */
export class FileSystemDriver {
  octokit: Octokit | null = null
  webdav: WebDAVClient | null = null
  repo: RepoItem
  // Google Drive file id, keyed by file path
  fileIds: Record<string, string> = {}
  // Version of each file as this session last read or wrote it (see ReadResult.version)
  versions: Record<string, string> = {}
  // Content of each file as this session last read or wrote it (for backups)
  lastContent: Record<string, string> = {}

  constructor(repo: RepoItem) {
    this.repo = repo
    this.init(repo)
  }

  init(repo: RepoItem): void {
    this.repo = repo

    if (repo.type == 'github') {
      this.octokit = new Octokit({ auth: repo.key })
    }
    if (repo.type == 'webdav') {
      this.webdav = createClient(repo.url!, {
        username: repo.username,
        password: repo.password,
      })
    }
    // localstorage needs no setup; googledrive auth is lazy — happens on first read/write
  }

  // ===============================================================
  // Public API
  // ===============================================================

  async readJson(path: string): Promise<unknown> {
    const { data } = await this.readFile(path)
    return JSON.parse(data)
  }

  async readEncryptedJson(path: string, password: string): Promise<unknown> {
    const { data } = await this.readFile(path)
    if (!data) throw new NotFoundError(path)
    return decryptJson(data, password)
  }

  writeJson(path: string, value: unknown, options?: WriteOptions): Promise<void> {
    return this.writeFile(path, JSON.stringify(value, null, 4), options)
  }

  async writeEncryptedJson(path: string, value: unknown, password: string, options?: WriteOptions): Promise<void> {
    await this.writeFile(path, await encrypt(JSON.stringify(value, null, 4), password), options)
  }

  async readFile(path: string): Promise<ReadResult> {
    let result: ReadResult
    try {
      switch (this.repo.type) {
        case 'localstorage': result = await this.readLocalStorage(path); break
        case 'github': result = await this.readGithub(path); break
        case 'webdav': result = await this.readWebdav(path); break
        case 'googledrive': result = await this.readGoogleDrive(path); break
        default: throw new Error(`Unknown repo type: ${this.repo.type}`)
      }
    } catch (error) {
      throw describeAccessError(error, this.repo)
    }
    this.versions[path] = result.version
    this.lastContent[path] = result.data
    return result
  }

  /**
   * Write a file. If this session read or wrote the file before, the write fails with
   * ConflictError when the file was changed elsewhere in the meantime (unless `force`).
   */
  async writeFile(path: string, data: string, { force = false }: WriteOptions = {}): Promise<void> {
    const expected = force ? undefined : this.versions[path]
    let version: string
    try {
      switch (this.repo.type) {
        case 'localstorage': version = await this.writeLocalStorage(path, data, expected); break
        case 'github': version = await this.writeGithub(path, data, expected); break
        case 'webdav': version = await this.writeWebdav(path, data, expected); break
        case 'googledrive': version = await this.writeGoogleDrive(path, data, expected); break
        default: throw new Error(`Unknown repo type: ${this.repo.type}`)
      }
    } catch (error) {
      throw describeAccessError(error, this.repo)
    }
    this.versions[path] = version
    this.lastContent[path] = data
  }

  deleteFile(path: string): Promise<void> {
    switch (this.repo.type) {
      case 'localstorage': return this.deleteLocalStorage(path)
      case 'github': return this.deleteGithub(path)
      case 'webdav': return this.deleteWebdav(path)
      case 'googledrive': return this.deleteGoogleDrive(path)
    }
    return Promise.reject(new Error(`Unknown repo type: ${this.repo.type}`))
  }

  // ===============================================================
  // Local Storage
  // ===============================================================

  async readLocalStorage(path: string): Promise<ReadResult> {
    const data = localStorage.getItem(path) ?? ''
    return { data, version: contentHash(data) }
  }

  // Another tab can change the same key
  async writeLocalStorage(path: string, data: string, expected?: string): Promise<string> {
    if (expected !== undefined && contentHash(localStorage.getItem(path) ?? '') !== expected) {
      throw new ConflictError(path)
    }
    localStorage.setItem(path, data)
    return contentHash(data)
  }

  async deleteLocalStorage(path: string): Promise<void> {
    localStorage.removeItem(path)
  }

  // ===============================================================
  // GitHub
  // ===============================================================

  async readGithub(path: string): Promise<ReadResult> {
    path = trimLeadingSlashes(path)
    const { data }: any = await this.octokit!.rest.repos.getContent({
      owner: this.repo.login!,
      repo: this.repo.repo!,
      path,
    }).catch((error: unknown) => rethrowNotFound(error, path))
    return { data: decode(data.content), version: data.sha }
  }

  /**
   * GitHub refuses an update whose SHA is not the file's current one (409) — that is the
   * conflict check. Without an expected SHA the current one is looked up (overwrite;
   * undefined = the file doesn't exist and is created).
   */
  async writeGithub(path: string, data: string, expected?: string): Promise<string> {
    path = trimLeadingSlashes(path)
    const sha = expected ?? await this.fetchGithubSha(path)
    try {
      const { data: result }: any = await this.octokit!.rest.repos.createOrUpdateFileContents({
        owner: this.repo.login!,
        repo: this.repo.repo!,
        path,
        sha,
        message: 'update: ' + new Date(),
        content: encode(data),
      })
      return result?.content?.sha ?? ''
    } catch (error) {
      const status = httpStatus(error)
      if (expected !== undefined && (status === 409 || status === 422)) throw new ConflictError(path, { cause: error })
      if (status === 404) {
        throw new AuthError(`Repository "${this.repo.login}/${this.repo.repo}" was not found, or the token has no access to it.`, { cause: error })
      }
      throw error
    }
  }

  async fetchGithubSha(path: string): Promise<string | undefined> {
    try {
      const { data }: any = await this.octokit!.rest.repos.getContent({
        owner: this.repo.login!,
        repo: this.repo.repo!,
        path,
      })
      return data.sha
    } catch (error: any) {
      if (error?.status === 404) return undefined
      throw error
    }
  }

  async deleteGithub(path: string): Promise<void> {
    path = trimLeadingSlashes(path)
    const sha = await this.fetchGithubSha(path)
    if (sha === undefined) return
    await this.octokit!.rest.repos.deleteFile({
      owner: this.repo.login!,
      repo: this.repo.repo!,
      path,
      sha,
      message: 'delete: ' + new Date(),
    })
  }

  // ===============================================================
  // WebDAV
  // ===============================================================

  async readWebdav(path: string): Promise<ReadResult> {
    const buffer = await this.webdav!.getFileContents(path)
      .catch((error: unknown) => rethrowNotFound(error, path)) as ArrayBuffer
    const data = new TextDecoder('utf-8').decode(buffer)
    return { data, version: contentHash(data) }
  }

  /**
   * ETag support differs between servers, so the conflict check compares the content:
   * the file is read back and hashed before it is overwritten.
   */
  async writeWebdav(path: string, data: string, expected?: string): Promise<string> {
    if (expected !== undefined) {
      let current = ''
      try {
        current = (await this.readWebdav(path)).version
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error
      }
      if (current !== expected) throw new ConflictError(path)
    }
    await this.webdav!.putFileContents(
      path,
      new TextEncoder().encode(data),
      { contentLength: false, overwrite: true },
    )
    return contentHash(data)
  }

  async deleteWebdav(path: string): Promise<void> {
    await this.webdav!.deleteFile(path)
  }

  // ===============================================================
  // Google Drive
  // ===============================================================

  async readGoogleDrive(path: string): Promise<ReadResult> {
    const clientId = this.repo.gdrive_client_id!
    const token = await googleDrive.ensureToken(clientId)

    const fileId = await googleDrive.findFile(token, trimLeadingSlashes(path), clientId)
    if (!fileId) {
      throw new NotFoundError(path)
    }

    const [data, version] = await Promise.all([
      googleDrive.readFile(token, fileId),
      googleDrive.getVersion(token, fileId),
    ])
    this.fileIds[path] = fileId
    return { data, version }
  }

  /** Drive has no conditional update — the file version is checked right before writing */
  async writeGoogleDrive(path: string, data: string, expected?: string): Promise<string> {
    const clientId = this.repo.gdrive_client_id!
    const token = await googleDrive.ensureToken(clientId)
    const fileName = trimLeadingSlashes(path)

    let fileId: string | null = this.fileIds[path]
    if (!fileId) {
      fileId = await googleDrive.findFile(token, fileName, clientId)
    }

    if (!fileId) {
      if (expected !== undefined) throw new ConflictError(path)
      const created = await googleDrive.createFile(token, fileName, data)
      this.fileIds[path] = created.id
      return created.version
    }
    if (expected !== undefined && await googleDrive.getVersion(token, fileId) !== expected) {
      throw new ConflictError(path)
    }
    this.fileIds[path] = fileId
    return googleDrive.updateFile(token, fileId, data)
  }

  async deleteGoogleDrive(path: string): Promise<void> {
    const clientId = this.repo.gdrive_client_id!
    const token = await googleDrive.ensureToken(clientId)

    let fileId: string | null = this.fileIds[path]
    if (!fileId) {
      fileId = await googleDrive.findFile(token, trimLeadingSlashes(path), clientId)
    }

    if (fileId) {
      await googleDrive.deleteFile(token, fileId)
      delete this.fileIds[path]
    }
  }
}

/** Decrypt a database file and parse it; a wrong password throws DecryptionError */
export async function decryptJson(data: string, password: string): Promise<unknown> {
  const decrypted = await decrypt(data, password)
  try {
    return JSON.parse(decrypted)
  } catch (_) {
    // Legacy formats can "decrypt" with a wrong key into garbage
    throw new DecryptionError()
  }
}
