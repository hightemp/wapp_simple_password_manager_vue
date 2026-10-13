import type { RepoItem } from './FileSystemDriver'

/**
 * Local backups of the database file, kept in this browser's IndexedDB.
 * A backup is the encrypted file exactly as it was in the repository, so it is
 * protected by the master password it was saved with.
 */

export interface Backup {
  id: number
  // Repository the file came from (see backupKey)
  repo: string
  // When the backup was taken
  at: number
  // Encrypted file content
  data: string
}

// Backups kept per repository
export const BACKUP_LIMIT = 10

const DB_NAME = 'pm-backups'
const STORE = 'backups'

/** Identifies a repository without its secrets */
export function backupKey(repo: RepoItem): string {
  switch (repo.type) {
    case 'github': return `github:${repo.login}/${repo.repo}`
    case 'webdav': return `webdav:${repo.username ?? ''}@${repo.url}`
    case 'googledrive': return `googledrive:${repo.gdrive_client_id}`
    default: return repo.type
  }
}

let opening: Promise<IDBDatabase | null> | null = null

/** Resolves to null when IndexedDB is unavailable (private mode, old browser) */
function openDatabase(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        store.createIndex('repo', 'repo')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    } catch (_) {
      resolve(null)
    }
  })
  return opening
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Backups of a repository, newest first */
export async function listBackups(repo: string): Promise<Backup[]> {
  const db = await openDatabase()
  if (!db) return []
  const store = db.transaction(STORE).objectStore(STORE)
  const backups = await promisify(store.index('repo').getAll(repo)) as Backup[]
  return backups.sort((a, b) => b.at - a.at || b.id - a.id)
}

/**
 * Keep `data` as the newest backup of `repo` (skipped when it equals the newest one),
 * dropping the oldest beyond BACKUP_LIMIT. Never throws: a backup must not break saving.
 */
export async function addBackup(repo: string, data: string, at = Date.now()): Promise<void> {
  if (!data) return
  try {
    const db = await openDatabase()
    if (!db) return
    const existing = await listBackups(repo)
    if (existing[0]?.data === data) return

    const transaction = db.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    store.add({ repo, at, data })
    for (const old of existing.slice(BACKUP_LIMIT - 1)) store.delete(old.id)
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  } catch (_) {
    // Storage full or blocked — the save itself must still succeed
  }
}

export async function deleteBackups(repo: string): Promise<void> {
  const db = await openDatabase()
  if (!db) return
  const store = db.transaction(STORE, 'readwrite').objectStore(STORE)
  const keys = await promisify(store.index('repo').getAllKeys(repo))
  await Promise.all(keys.map((key) => promisify(store.delete(key))))
}
