import { Octokit } from "@octokit/rest"
import { createClient, WebDAVClient } from "webdav/web"
import { encode, decode } from 'js-base64'
import { fnEncrypt, fnDecrypt } from './crypto'
import { ensureToken, findFile, readFile as gdriveReadFile, createFile as gdriveCreateFile, updateFile as gdriveUpdateFile } from './GoogleDriveClient'

export interface RepoItem {
  type: 'localstorage' | 'github' | 'webdav' | 'googledrive'
  name: string
  login?: string
  repo?: string
  key?: string
  url?: string
  username?: string
  password?: string
  need_save?: boolean
  gdrive_client_id?: string
}

export interface ReadResult {
  sData: string
  sSHA: string
}

export class FileSystemDriver {
    octokit: Octokit | null = null
    oSHA: Record<string, string> = {}
    webdav: WebDAVClient | null = null
    oRepoItem: RepoItem

    // ===============================================================
    
    constructor(oRepoItem: RepoItem) {
        this.oRepoItem = oRepoItem
        this.fnInit(oRepoItem)
    }

    fnInit(oRepoItem: RepoItem): void {
        this.oRepoItem = oRepoItem

        if (oRepoItem.type == "github") {
            this.fnInitGit()
        }
        if (oRepoItem.type == "webdav") {
            this.fnInitWebdav()
        }
        if (oRepoItem.type == "localstorage") {
        }
        if (oRepoItem.type == "googledrive") {
            // Auth is lazy — happens on first read/write
        }
    }

    fnInitGit(): void {
        this.octokit = new Octokit({
            auth: this.oRepoItem.key,
        })
    }

    fnInitWebdav(): void {
        this.webdav = createClient(
            this.oRepoItem.url!,
            {
                username: this.oRepoItem.username,
                password: this.oRepoItem.password
            }
        )
    }

    // ===============================================================
    
    fnReadFileJSON(sFilePath: string): Promise<unknown> {
        return new Promise((fnResolv, fnReject) => {
            this.fnReadFile(sFilePath)
                .then(({ sData }) => {
                    fnResolv(JSON.parse(sData))
                })
                .catch((oE: unknown) => { fnReject(oE) })
        })
    }

    fnReadFileCryptoJSON(sFilePath: string, sKey: string): Promise<unknown> {
        return new Promise((fnResolv, fnReject) => {
            this.fnReadFile(sFilePath)
                .then(({ sData }) => {
                    if (!sData) fnReject('Not Found')
                    const sDecrypted = fnDecrypt(sData, sKey)
                    fnResolv(JSON.parse(sDecrypted))
                })
                .catch((oE: unknown) => { fnReject(oE) })
        })
    }

    fnReadFile(sFilePath: string): Promise<ReadResult> {
        if (this.oRepoItem.type == "localstorage") {
            return this.fnReadFileLocalStorage(sFilePath)
        }
        if (this.oRepoItem.type == "github") {
            return this.fnReadFileGithub(sFilePath)
        }
        if (this.oRepoItem.type == "webdav") {
            return this.fnReadFileWebdav(sFilePath)
        }
        if (this.oRepoItem.type == "googledrive") {
            return this.fnReadFileGoogleDrive(sFilePath)
        }
        return Promise.reject(new Error(`Unknown repo type: ${this.oRepoItem.type}`))
    }

    fnWriteFileJSON(sFilePath: string, mData: unknown): Promise<void> {
        return this.fnWriteFile(sFilePath, JSON.stringify(mData, null, 4))
    }

    fnWriteFileCryptoJSON(sFilePath: string, mData: unknown, sKey: string): Promise<void> {
        return this.fnWriteFile(sFilePath, fnEncrypt(JSON.stringify(mData, null, 4), sKey))
    }

    fnWriteFile(sFilePath: string, sData: string): Promise<void> {
        if (this.oRepoItem.type == "localstorage") {
            return this.fnWriteFileLocalStorage(sFilePath, sData)
        }
        if (this.oRepoItem.type == "github") {
            return this.fnWriteFileGithub(sFilePath, sData)
        }
        if (this.oRepoItem.type == "webdav") {
            return this.fnWriteFileWebdav(sFilePath, sData)
        }
        if (this.oRepoItem.type == "googledrive") {
            return this.fnWriteFileGoogleDrive(sFilePath, sData)
        }
        return Promise.reject(new Error(`Unknown repo type: ${this.oRepoItem.type}`))
    }

    fnCreateDir(sFilePath: string): Promise<void> | undefined {
        if (this.oRepoItem.type == 'webdav') {
            return this.fnCreateDirWebdav(sFilePath)
        }
    }

    // ===============================================================

    fnCreateDirWebdav(sFilePath: string): Promise<void> {
        return new Promise((fnResolv, fnReject) => {
            this.webdav!.createDirectory(sFilePath)
                .then(() => fnResolv())
                .catch((oE: unknown) => fnReject(oE))
        })
    }

    fnReadFileLocalStorage(sFilePath: string): Promise<ReadResult> {
        return new Promise((fnResolv) => {
            const sData = localStorage.getItem(sFilePath) ?? ''
            fnResolv({ sData, sSHA: '' })
        })
    }

    fnReadFileWebdav(sFilePath: string): Promise<ReadResult> {
        return new Promise(async (fnResolv, fnReject) => {
            try {
                const oData = await this.webdav!.getFileContents(sFilePath) as ArrayBuffer
                const enc = new TextDecoder('utf-8')
                const sData = enc.decode(oData)
                this.oSHA[sFilePath] = ''
                fnResolv({ sData, sSHA: '' })
            } catch (oE) {
                fnReject(oE)
            }
        })
    }

    fnReadFileGithub(sFilePath: string): Promise<ReadResult> {
        return new Promise(async (fnResolv, fnReject) => {
            const oR = this.oRepoItem
            sFilePath = sFilePath.replace(/^\/+/, '')
            return this.octokit!.rest.repos.getContent({
                owner: oR.login!,
                repo: oR.repo!,
                path: sFilePath,
            }).then(({ data }: any) => {
                const sData = decode(data.content)
                this.oSHA[sFilePath] = data.sha
                fnResolv({ sData, sSHA: data.sha })
            }).catch((oE: unknown) => {
                fnReject(oE)
            })
        })
    }

    fnWriteFileLocalStorage(sFilePath: string, sData: string): Promise<void> {
        return new Promise((fnResolv) => {
            localStorage.setItem(sFilePath, sData)
            fnResolv()
        })
    }

    fnWriteFileGithub(sFilePath: string, sData: string, sSHA: string | null = null): Promise<void> {
        return new Promise(async (fnResolv, fnReject) => {
            const oR = this.oRepoItem
            sFilePath = sFilePath.replace(/^\/+/, '')
            return this.octokit!.rest.repos.createOrUpdateFileContents({
                owner: oR.login!,
                repo: oR.repo!,
                path: sFilePath,
                sha: sSHA ? sSHA : this.oSHA[sFilePath],
                message: this.fnGetUpdateMessage(),
                content: encode(sData)
            })
            .then(() => {
                fnResolv()
            })
            .catch((oE: unknown) => {
                fnReject(oE)
            })
        })
    }

    fnWriteFileWebdav(sFilePath: string, sData: string): Promise<void> {
        return new Promise(async (fnResolv, fnReject) => {
            try {
                const enc = new TextEncoder()
                const aData = enc.encode(sData)
                await this.webdav!.putFileContents(
                    sFilePath, 
                    aData,
                    { contentLength: false, overwrite: true }
                )
                fnResolv()
            } catch (oE) {
                fnReject(oE)
            }
        })
    }

    fnGetUpdateMessage(): string {
        return 'update: ' + new Date()
    }

    // ===============================================================
    // Google Drive
    // ===============================================================

    async fnReadFileGoogleDrive(sFilePath: string): Promise<ReadResult> {
        const clientId = this.oRepoItem.gdrive_client_id!
        const token = await ensureToken(clientId)
        const fileName = sFilePath.replace(/^\/+/, '')

        const fileId = await findFile(token, fileName, clientId)
        if (!fileId) {
            throw new Error('Not Found')
        }

        const sData = await gdriveReadFile(token, fileId)
        this.oSHA[sFilePath] = fileId
        return { sData, sSHA: fileId }
    }

    async fnWriteFileGoogleDrive(sFilePath: string, sData: string): Promise<void> {
        const clientId = this.oRepoItem.gdrive_client_id!
        const token = await ensureToken(clientId)
        const fileName = sFilePath.replace(/^\/+/, '')

        let fileId = this.oSHA[sFilePath]
        if (!fileId) {
            fileId = await findFile(token, fileName, clientId) ?? undefined
        }

        if (fileId) {
            await gdriveUpdateFile(token, fileId, sData)
        } else {
            const newId = await gdriveCreateFile(token, fileName, sData)
            this.oSHA[sFilePath] = newId
        }
    }
}