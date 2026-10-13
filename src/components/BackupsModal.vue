<template>
  <BaseModal :model-value="repo !== null" :title="`Backups: ${repo?.name ?? ''}`" size="md" @update:model-value="(open) => !open && emit('close')">
    <p class="backups-text">
      Before the database in this repository is overwritten, the previous version is kept in this browser
      (the last {{ BACKUP_LIMIT }}, encrypted with the master password they were saved with).
    </p>

    <p v-if="isLoadingList" class="backups-empty">Loading…</p>
    <p v-else-if="backups.length === 0" class="backups-empty">No backups yet. They appear after the first save.</p>
    <ul v-else class="backups-list">
      <li v-for="backup in backups" :key="backup.id" class="backup-row">
        <div class="i-lucide-archive backup-icon" />
        <div class="backup-info">
          <span class="backup-date">{{ formatDate(backup.at) }}</span>
          <span class="backup-size">{{ formatSize(backup.data.length) }}</span>
        </div>
        <button class="action-btn action-btn--ghost action-btn--sm" :disabled="isRestoring" @click="restore(backup)">
          <div class="i-lucide-archive-restore" /> Restore
        </button>
      </li>
    </ul>

    <Transition name="error-slide">
      <div v-if="error" class="backups-error">
        <div class="i-lucide-alert-circle" />
        <span>{{ error }}</span>
      </div>
    </Transition>

    <template #footer>
      <div class="modal-footer-row">
        <button v-if="backups.length" class="action-btn action-btn--danger backups-delete" @click="deleteAll">
          <div class="i-lucide-trash-2" /> Delete all
        </button>
        <button class="action-btn action-btn--primary" @click="emit('close')">Close</button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useReposStore } from '@/stores/repos'
import { listBackups, deleteBackups, backupKey, BACKUP_LIMIT, type Backup } from '@/services/backups'
import { DecryptionError } from '@/utils/crypto'
import { useNotify } from '@/composables/useNotify'
import { useConfirm } from '@/composables/useConfirm'
import BaseModal from './BaseModal.vue'

const props = defineProps<{
  // Index of the repository in repos.allRepos; the modal is shown while it is set
  repoIndex: number | null
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const db = useDatabaseStore()
const repos = useReposStore()
const notify = useNotify()
const confirmAction = useConfirm()

const repo = computed(() => (props.repoIndex === null ? null : repos.allRepos[props.repoIndex] ?? null))
const backups = ref<Backup[]>([])
const isLoadingList = ref(false)
const isRestoring = ref(false)
const error = ref('')

watch(repo, async (current) => {
  error.value = ''
  backups.value = []
  if (!current) return
  isLoadingList.value = true
  backups.value = await listBackups(backupKey(current))
  isLoadingList.value = false
}, { immediate: true })

function formatDate(at: number): string {
  return new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

async function restore(backup: Backup) {
  error.value = ''
  if (!db.masterPassword) {
    error.value = 'Enter the master password first'
    return
  }
  const confirmed = await confirmAction({
    title: 'Restore backup',
    message: `Open the backup from ${formatDate(backup.at)} instead of the current database?\n\n` +
      `Nothing is stored until you press Save — then it replaces the database in "${repo.value!.name}".`,
    confirmText: 'Restore',
  })
  if (!confirmed) return

  isRestoring.value = true
  try {
    // Work with this repository (keeps its driver if it is the connected one)
    const index = props.repoIndex!
    if (repos.selectedIndex !== index) repos.selectRepo(index)
    if (!repos.fileSystems[index]) repos.createFileSystem(index)
    await db.restoreBackup(backup.data)
  } catch (restoreError) {
    error.value = restoreError instanceof DecryptionError
      ? 'This backup was saved with a different master password. Type that password in the repository window and try again.'
      : 'The backup could not be opened: ' + (restoreError instanceof Error ? restoreError.message : String(restoreError))
    return
  } finally {
    isRestoring.value = false
  }
  db.connectionError = ''
  db.isRepoWindowOpen = false
  emit('close')
  notify('Backup restored', 'Press Save to store it in the repository', 'success', 6000)
}

async function deleteAll() {
  const confirmed = await confirmAction({
    title: 'Delete backups',
    message: `Delete all ${backups.value.length} backups of "${repo.value!.name}" from this browser?`,
    confirmText: 'Delete',
    danger: true,
  })
  if (!confirmed) return
  await deleteBackups(backupKey(repo.value!))
  backups.value = []
}
</script>

<style scoped>
.backups-text {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

.backups-empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.backups-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
}

.backup-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--c-border);
}
.backup-row:last-child {
  border-bottom: none;
}

.backup-icon {
  flex-shrink: 0;
  color: var(--c-text-muted);
}

.backup-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.backup-date {
  font-size: var(--text-sm);
  color: var(--c-text);
}

.backup-size {
  font-size: var(--text-xs);
  color: var(--c-text-muted);
}

.backups-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: color-mix(in srgb, var(--c-danger) 12%, transparent);
  border-radius: var(--radius-md);
  color: var(--c-danger);
  font-size: var(--text-sm);
}

.backups-delete {
  margin-right: auto;
}
</style>
