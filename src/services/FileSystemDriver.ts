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
  needsSave?: boolean
  gdrive_client_id?: string
}

export interface ReadResult {
  data: string
  sha: string
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
  // GitHub blob SHA or Google Drive file id, keyed by file path
  fileIds: Record<string, string> = {}

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
    if (!data) throw new Error('Not Found')
    const decrypted = await decrypt(data, password)
    try {
      return JSON.parse(decrypted)
    } catch (_) {
      // Legacy formats can "decrypt" with a wrong key into garbage
      throw new DecryptionError()
    }
  }

  writeJson(path: string, value: unknown): Promise<void> {
    return this.writeFile(path, JSON.stringify(value, null, 4))
  }

  async writeEncryptedJson(path: string, value: unknown, password: string): Promise<void> {
    await this.writeFile(path, await encrypt(JSON.stringify(value, null, 4), password))
  }

  readFile(path: string): Promise<ReadResult> {
    switch (this.repo.type) {
      case 'localstorage': return this.readLocalStorage(path)
      case 'github': return this.readGithub(path)
      case 'webdav': return this.readWebdav(path)
      case 'googledrive': return this.readGoogleDrive(path)
    }
    return Promise.reject(new Error(`Unknown repo type: ${this.repo.type}`))
  }

  writeFile(path: string, data: string): Promise<void> {
    switch (this.repo.type) {
      case 'localstorage': return this.writeLocalStorage(path, data)
      case 'github': return this.writeGithub(path, data)
      case 'webdav': return this.writeWebdav(path, data)
      case 'googledrive': return this.writeGoogleDrive(path, data)
    }
    return Promise.reject(new Error(`Unknown repo type: ${this.repo.type}`))
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

  async createDir(path: string): Promise<void> {
    if (this.repo.type == 'webdav') {
      await this.webdav!.createDirectory(path)
    }
  }

  // ===============================================================
  // Local Storage
  // ===============================================================

  async readLocalStorage(path: string): Promise<ReadResult> {
    return { data: localStorage.getItem(path) ?? '', sha: '' }
  }

  async writeLocalStorage(path: string, data: string): Promise<void> {
    localStorage.setItem(path, data)
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
    })
    this.fileIds[path] = data.sha
    return { data: decode(data.content), sha: data.sha }
  }

  async writeGithub(path: string, data: string, sha: string | null = null): Promise<void> {
    path = trimLeadingSlashes(path)
    await this.octokit!.rest.repos.createOrUpdateFileContents({
      owner: this.repo.login!,
      repo: this.repo.repo!,
      path,
      sha: sha ? sha : this.fileIds[path],
      message: 'update: ' + new Date(),
      content: encode(data),
    })
  }

  async deleteGithub(path: string): Promise<void> {
    path = trimLeadingSlashes(path)
    // Need SHA to delete — fetch it first if not cached
    let sha = this.fileIds[path]
    if (!sha) {
      const { data }: any = await this.octokit!.rest.repos.getContent({
        owner: this.repo.login!,
        repo: this.repo.repo!,
        path,
      })
      sha = data.sha
    }
    await this.octokit!.rest.repos.deleteFile({
      owner: this.repo.login!,
      repo: this.repo.repo!,
      path,
      sha,
      message: 'delete: ' + new Date(),
    })
    delete this.fileIds[path]
  }

  // ===============================================================
  // WebDAV
  // ===============================================================

  async readWebdav(path: string): Promise<ReadResult> {
    const buffer = await this.webdav!.getFileContents(path) as ArrayBuffer
    this.fileIds[path] = ''
    return { data: new TextDecoder('utf-8').decode(buffer), sha: '' }
  }

  async writeWebdav(path: string, data: string): Promise<void> {
    await this.webdav!.putFileContents(
      path,
      new TextEncoder().encode(data),
      { contentLength: false, overwrite: true },
    )
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
      throw new Error('Not Found')
    }

    const data = await googleDrive.readFile(token, fileId)
    this.fileIds[path] = fileId
    return { data, sha: fileId }
  }

  async writeGoogleDrive(path: string, data: string): Promise<void> {
    const clientId = this.repo.gdrive_client_id!
    const token = await googleDrive.ensureToken(clientId)
    const fileName = trimLeadingSlashes(path)

    let fileId: string | null = this.fileIds[path]
    if (!fileId) {
      fileId = await googleDrive.findFile(token, fileName, clientId)
    }

    if (fileId) {
      await googleDrive.updateFile(token, fileId, data)
    } else {
      this.fileIds[path] = await googleDrive.createFile(token, fileName, data)
    }
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
