import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { addBackup, listBackups, deleteBackups, backupKey, BACKUP_LIMIT } from '../../services/backups'

describe('backups', () => {
  beforeEach(async () => {
    await deleteBackups('a')
    await deleteBackups('b')
  })

  it('should keep backups per repository, newest first', async () => {
    await addBackup('a', 'one', 1)
    await addBackup('a', 'two', 2)
    await addBackup('b', 'other', 3)
    expect((await listBackups('a')).map((b) => b.data)).toEqual(['two', 'one'])
    expect((await listBackups('b')).map((b) => b.data)).toEqual(['other'])
  })

  it('should skip a backup equal to the newest one', async () => {
    await addBackup('a', 'same', 1)
    await addBackup('a', 'same', 2)
    expect(await listBackups('a')).toHaveLength(1)
  })

  it(`should keep only the last ${BACKUP_LIMIT}`, async () => {
    for (let i = 1; i <= BACKUP_LIMIT + 3; i++) await addBackup('a', 'v' + i, i)
    const backups = await listBackups('a')
    expect(backups).toHaveLength(BACKUP_LIMIT)
    expect(backups[0].data).toBe('v' + (BACKUP_LIMIT + 3))
    expect(backups.at(-1).data).toBe('v4')
  })

  it('should delete the backups of one repository', async () => {
    await addBackup('a', 'x', 1)
    await addBackup('b', 'y', 1)
    await deleteBackups('a')
    expect(await listBackups('a')).toEqual([])
    expect(await listBackups('b')).toHaveLength(1)
  })

  it('should identify repositories without their secrets', () => {
    expect(backupKey({ type: 'github', name: 'x', login: 'me', repo: 'vault', key: 'ghp_secret' })).toBe('github:me/vault')
    expect(backupKey({ type: 'webdav', name: 'x', url: 'https://dav', username: 'u', password: 'secret' })).toBe('webdav:u@https://dav')
    expect(backupKey({ type: 'localstorage', name: 'Local' })).toBe('localstorage')
  })
})
