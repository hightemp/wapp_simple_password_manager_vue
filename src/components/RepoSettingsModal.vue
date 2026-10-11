<template>
<BaseModal v-model="db.isRepoWindowOpen" title="Repository Settings" size="lg" :persistent="true" :closable="false">
  <div class="repo-layout">
    <!-- === Left: repo list === -->
    <div class="repo-list-panel">
      <!-- Master password -->
      <div class="master-pw">
        <div class="master-pw-icon"><div class="i-lucide-lock" /></div>
        <input
          type="password"
          class="master-input"
          placeholder="Master Password"
          v-model="db.masterPassword"
          autocomplete="off"
        />
      </div>

      <!-- Connection error -->
      <Transition name="error-slide">
        <div v-if="db.connectionError" class="connection-error">
          <div class="connection-error-icon"><div class="i-lucide-alert-circle" /></div>
          <div class="connection-error-body">
            <span class="connection-error-text">{{ db.connectionError }}</span>
            <button class="connection-error-close" @click="db.connectionError = ''" aria-label="Dismiss">
              <div class="i-lucide-x" />
            </button>
          </div>
        </div>
      </Transition>

      <!-- Repo list -->
      <div class="repo-list">
        <div
          v-for="(repo, index) in repos.allRepos"
          :key="index"
          :class="['repo-card', { active: repos.selectedIndex === index }]"
          @click="repos.selectRepo(index)"
        >
          <template v-if="repo">
            <div class="repo-card-icon">
              <div v-if="repo.type === 'github'" class="i-lucide-github" />
              <div v-else-if="repo.type === 'webdav'" class="i-lucide-cloud" />
              <div v-else-if="repo.type === 'googledrive'" class="i-lucide-hard-drive" />
              <div v-else class="i-lucide-hard-drive" />
            </div>
            <div class="repo-card-info">
              <div class="repo-card-name">{{ repo.name }}</div>
              <div class="repo-card-type">{{ repo.type }}</div>
            </div>
            <div class="repo-card-actions">
              <button class="repo-icon-btn repo-icon-btn--danger" @click.stop="openClearStorage(index)" title="Clear storage data" aria-label="Clear storage">
                <div class="i-lucide-database-zap" />
              </button>
              <template v-if="repo.type !== 'localstorage'">
                <button class="repo-icon-btn" @click.stop="editRepo(index)" title="Edit" aria-label="Edit repository">
                  <div class="i-lucide-pencil" />
                </button>
                <button class="repo-icon-btn repo-icon-btn--danger" @click.stop="repos.removeRepo(index)" title="Delete" aria-label="Delete repository">
                  <div class="i-lucide-trash-2" />
                </button>
              </template>
            </div>
          </template>
        </div>

        <!-- Add button -->
        <button class="repo-add-card" @click="newRepo">
          <div class="i-lucide-plus" />
          <span>Add Repository</span>
        </button>
      </div>
    </div>

    <!-- === Right: edit form === -->
    <div class="repo-form-panel" v-if="editIndex !== null">
      <h3 class="form-panel-title">{{ editIndex === -1 ? 'New Repository' : 'Edit Repository' }}</h3>

      <div class="form-field">
        <label class="form-field-label">Type</label>
        <select class="form-field-input" v-model="form.type">
          <option value="github">GitHub</option>
          <option value="webdav">WebDAV</option>
          <option value="googledrive">Google Drive</option>
        </select>
      </div>

      <div class="form-field">
        <label class="form-field-label">Name</label>
        <input type="text" :class="['form-field-input', { 'input-error': errors.name }]" v-model="form.name" placeholder="My Repository" autocomplete="off" />
        <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
      </div>

      <template v-if="form.type === 'github'">
        <div class="form-field">
          <label class="form-field-label">Login</label>
          <input type="text" :class="['form-field-input', { 'input-error': errors.login }]" v-model="form.login" placeholder="username" autocomplete="off" />
          <span v-if="errors.login" class="field-error">{{ errors.login }}</span>
        </div>
        <div class="form-field">
          <label class="form-field-label">Repository</label>
          <input type="text" :class="['form-field-input', { 'input-error': errors.repo }]" v-model="form.repo" placeholder="repo-name" autocomplete="off" />
          <span v-if="errors.repo" class="field-error">{{ errors.repo }}</span>
        </div>
        <div class="form-field">
          <label class="form-field-label">API Key</label>
          <div class="input-with-toggle">
            <input :type="showApiKey ? 'text' : 'password'" :class="['form-field-input', { 'input-error': errors.key }]" v-model="form.key" placeholder="ghp_..." autocomplete="off" />
            <button class="input-toggle-btn" @click="showApiKey = !showApiKey" type="button" :aria-label="showApiKey ? 'Hide' : 'Show'">
              <div :class="showApiKey ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
            </button>
          </div>
          <span v-if="errors.key" class="field-error">{{ errors.key }}</span>
        </div>
      </template>

      <template v-if="form.type === 'webdav'">
        <div class="form-field">
          <label class="form-field-label">URL</label>
          <input type="url" :class="['form-field-input', { 'input-error': errors.url }]" v-model="form.url" placeholder="https://..." autocomplete="off" />
          <span v-if="errors.url" class="field-error">{{ errors.url }}</span>
        </div>
        <div class="form-field">
          <label class="form-field-label">Username</label>
          <input type="text" :class="['form-field-input', { 'input-error': errors.username }]" v-model="form.username" autocomplete="off" />
          <span v-if="errors.username" class="field-error">{{ errors.username }}</span>
        </div>
        <div class="form-field">
          <label class="form-field-label">Password</label>
          <div class="input-with-toggle">
            <input :type="showWebdavPassword ? 'text' : 'password'" :class="['form-field-input', { 'input-error': errors.password }]" v-model="form.password" autocomplete="off" />
            <button class="input-toggle-btn" @click="showWebdavPassword = !showWebdavPassword" type="button" :aria-label="showWebdavPassword ? 'Hide' : 'Show'">
              <div :class="showWebdavPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
            </button>
          </div>
          <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
        </div>
      </template>

      <template v-if="form.type === 'googledrive'">
        <div class="form-field">
          <label class="form-field-label">Client ID</label>
          <input type="text" :class="['form-field-input', { 'input-error': errors.gdrive_client_id }]" v-model="form.gdrive_client_id" placeholder="123456.apps.googleusercontent.com" autocomplete="off" />
          <span v-if="errors.gdrive_client_id" class="field-error">{{ errors.gdrive_client_id }}</span>
        </div>
        <p class="gdrive-hint">Files are stored in the hidden appDataFolder — only this app can access them.</p>
      </template>

      <div class="form-actions">
        <button class="action-btn action-btn--ghost" @click="cancelEdit">Cancel</button>
        <button class="action-btn action-btn--primary" @click="saveRepo">Save</button>
      </div>
    </div>

    <!-- === Clear storage confirmation === -->
    <div class="repo-form-panel" v-else-if="clearIndex !== null">
      <h3 class="form-panel-title">Clear Storage</h3>

      <div class="clear-storage-warning">
        <div class="clear-storage-warning-icon"><div class="i-lucide-alert-triangle" /></div>
        <div>
          <p class="clear-storage-warning-text">
            This will permanently delete the encrypted database from
            <strong>{{ clearRepoName }}</strong>.
            This action cannot be undone.
          </p>
        </div>
      </div>

      <div class="form-field">
        <label class="form-field-label">Type <strong>{{ clearRepoName }}</strong> to confirm</label>
        <input
          type="text"
          class="form-field-input"
          v-model="clearConfirmText"
          :placeholder="clearRepoName"
          autocomplete="off"
        />
      </div>

      <Transition name="error-slide">
        <div v-if="clearError" class="connection-error" style="margin-bottom: var(--space-3)">
          <div class="connection-error-icon"><div class="i-lucide-alert-circle" /></div>
          <div class="connection-error-body">
            <span class="connection-error-text">{{ clearError }}</span>
          </div>
        </div>
      </Transition>

      <Transition name="error-slide">
        <div v-if="clearSuccess" class="clear-storage-success">
          <div class="i-lucide-check-circle" />
          <span>{{ clearSuccess }}</span>
        </div>
      </Transition>

      <div class="form-actions">
        <button class="action-btn action-btn--ghost" @click="cancelClearStorage">Cancel</button>
        <button
          class="action-btn action-btn--danger"
          @click="clearStorage"
          :disabled="isClearing || clearConfirmText !== clearRepoName"
        >
          <div v-if="isClearing" class="i-lucide-loader-2 spin" />
          <div v-else class="i-lucide-database-zap" />
          {{ isClearing ? 'Clearing...' : 'Clear Storage' }}
        </button>
      </div>
    </div>

    <!-- Empty state when no edit -->
    <div class="repo-form-panel repo-form-empty" v-else>
      <div class="i-lucide-mouse-pointer-click empty-icon" />
      <p>Select a repository or add a new one</p>
    </div>
  </div>

  <template #footer>
    <div class="modal-footer-row">
      <div class="footer-left">
        <input type="file" ref="importInput" class="sr-only" accept=".json" @change="importRepos" />
        <button class="action-btn action-btn--ghost action-btn--sm" @click="exportRepos" title="Export repositories">
          <div class="i-lucide-download" /> Export
        </button>
        <button class="action-btn action-btn--ghost action-btn--sm" @click="importInput?.click()" title="Import repositories">
          <div class="i-lucide-upload" /> Import
        </button>
        <button class="action-btn action-btn--danger action-btn--sm" @click="repos.clearRepos()" title="Clear all">
          <div class="i-lucide-trash-2" /> Clear
        </button>
      </div>
      <button class="action-btn action-btn--primary" @click="connect">
        <div class="i-lucide-log-in" /> Connect
      </button>
    </div>
  </template>
</BaseModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, useTemplateRef } from 'vue'
import { useDatabaseStore, DATABASE_PATH } from '@/stores/database'
import { useReposStore } from '@/stores/repos'
import { downloadJson } from '@/utils/download'
import { FileSystemDriver, type RepoItem, type RepoType } from '@/services/FileSystemDriver'
import { useNotify } from '@/composables/useNotify'
import { useConfirm } from '@/composables/useConfirm'
import BaseModal from './BaseModal.vue'

const db = useDatabaseStore()
const repos = useReposStore()
const notify = useNotify()
const confirmAction = useConfirm()

// --- Repo edit form ---
// null = form hidden, -1 = new repo, otherwise index in repos.allRepos
const editIndex = ref<number | null>(null)
const form = reactive({
  type: 'github' as RepoType,
  name: '',
  login: '',
  repo: '',
  key: '',
  url: '',
  username: '',
  password: '',
  gdrive_client_id: '',
})
const errors = reactive<Record<string, string>>({})
const showApiKey = ref(false)
const showWebdavPassword = ref(false)

// --- Clear storage ---
const clearIndex = ref<number | null>(null)
const clearConfirmText = ref('')
const clearError = ref('')
const clearSuccess = ref('')
const isClearing = ref(false)
const clearRepoName = computed(() =>
  clearIndex.value === null ? '' : repos.allRepos[clearIndex.value]?.name ?? ''
)

function validateForm(): boolean {
  for (const key in errors) delete errors[key]

  if (!form.name.trim()) {
    errors.name = 'Name is required'
  }

  if (form.type === 'github') {
    if (!form.login.trim()) errors.login = 'Login is required'
    if (!form.repo.trim()) errors.repo = 'Repository is required'
    if (!form.key.trim()) {
      errors.key = 'API Key is required'
    } else if (!/^(ghp_|github_pat_)/.test(form.key.trim())) {
      errors.key = 'API Key should start with ghp_ or github_pat_'
    }
  }

  if (form.type === 'webdav') {
    if (!form.url.trim()) {
      errors.url = 'URL is required'
    } else {
      try { new URL(form.url.trim()) } catch { errors.url = 'Invalid URL format' }
    }
    if (!form.username.trim()) errors.username = 'Username is required'
    if (!form.password.trim()) errors.password = 'Password is required'
  }

  if (form.type === 'googledrive') {
    if (!form.gdrive_client_id.trim()) {
      errors.gdrive_client_id = 'Client ID is required'
    } else if (!form.gdrive_client_id.includes('.apps.googleusercontent.com')) {
      errors.gdrive_client_id = 'Client ID must contain .apps.googleusercontent.com'
    }
  }

  return Object.keys(errors).length === 0
}

function fillForm(repo: Partial<RepoItem>) {
  form.type = repo.type ?? 'github'
  form.name = repo.name ?? ''
  form.login = repo.login ?? ''
  form.repo = repo.repo ?? ''
  form.key = repo.key ?? ''
  form.url = repo.url ?? ''
  form.username = repo.username ?? ''
  form.password = repo.password ?? ''
  form.gdrive_client_id = repo.gdrive_client_id ?? ''
}

function newRepo() {
  clearIndex.value = null
  editIndex.value = -1
  fillForm({})
}

function editRepo(index: number) {
  clearIndex.value = null
  editIndex.value = index
  fillForm(repos.allRepos[index])
}

function saveRepo() {
  if (!validateForm()) return
  repos.saveRepo(editIndex.value!, { ...form })
  editIndex.value = null
}

function cancelEdit() {
  editIndex.value = null
}

function connect() {
  if (!repos.currentRepo) {
    notify('No repository selected', 'Select a repository in the list first', 'error')
    return
  }
  db.connectionError = ''
  db.isRepoWindowOpen = false
  db.connectToCurrentRepo()
}

// --- Export / import repo list ---
const importInput = useTemplateRef<HTMLInputElement>('importInput')

async function exportRepos() {
  const confirmed = await confirmAction({
    title: 'Export repositories',
    message: 'The exported file contains API keys and passwords of your repositories in plain text.\n\n' +
      'Store it somewhere safe and delete it after use.',
    confirmText: 'Export',
  })
  if (!confirmed) return
  downloadJson('repositories', JSON.stringify(repos.allRepos))
}

function importRepos() {
  const input = importInput.value!
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.readAsText(file)
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result as string)
      if (Array.isArray(data)) {
        repos.importRepos(data)
      }
    } catch (_) {
      /* ignore invalid JSON */
    }
    input.value = ''
  }
}

// --- Clear storage ---
function openClearStorage(index: number) {
  editIndex.value = null
  clearIndex.value = index
  clearConfirmText.value = ''
  clearError.value = ''
  clearSuccess.value = ''
  isClearing.value = false
}

function cancelClearStorage() {
  clearIndex.value = null
  clearConfirmText.value = ''
  clearError.value = ''
  clearSuccess.value = ''
}

async function clearStorage() {
  if (clearIndex.value === null) return
  if (clearConfirmText.value !== clearRepoName.value) return

  isClearing.value = true
  clearError.value = ''
  clearSuccess.value = ''

  try {
    const repo = repos.allRepos[clearIndex.value]
    await new FileSystemDriver(repo).deleteFile(DATABASE_PATH)
    clearSuccess.value = `Storage data for "${repo.name}" has been deleted.`
  } catch (e: any) {
    clearError.value = 'Failed to clear storage: ' + (e?.message || e)
  } finally {
    isClearing.value = false
  }
}
</script>

<style scoped>
.repo-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: var(--space-4);
  min-height: 400px;
}

/* === Left panel === */
.repo-list-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  border-right: 1px solid var(--c-border);
  padding-right: var(--space-4);
}

.master-pw {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: var(--c-bg);
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
}

.master-pw-icon {
  color: var(--c-text-muted);
  font-size: 18px;
  flex-shrink: 0;
}

.master-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--c-text);
  font-size: var(--text-base);
  outline: none;
  min-width: 0;
}
.master-input::placeholder {
  color: var(--c-text-muted);
}

/* === Connection error === */
.connection-error {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: color-mix(in srgb, var(--c-danger) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--c-danger) 25%, transparent);
  border-radius: var(--radius-md);
}

.connection-error-icon {
  color: var(--c-danger);
  font-size: 16px;
  flex-shrink: 0;
  margin-top: 1px;
}

.connection-error-body {
  flex: 1;
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  min-width: 0;
}

.connection-error-text {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--c-danger);
  line-height: 1.4;
}

.connection-error-close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-danger);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 14px;
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}
.connection-error-close:hover {
  opacity: 1;
}

.repo-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow-y: auto;
  flex: 1;
}

.repo-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}
.repo-card:hover {
  background: var(--c-bg-hover);
}
.repo-card.active {
  background: var(--c-bg-hover);
  border-left: 3px solid var(--c-accent);
}

.repo-card-icon {
  font-size: 20px;
  color: var(--c-text-muted);
  flex-shrink: 0;
}
.repo-card.active .repo-card-icon {
  color: var(--c-accent);
}

.repo-card-info {
  flex: 1;
  min-width: 0;
}

.repo-card-name {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repo-card-type {
  font-size: var(--text-xs);
  color: var(--c-text-muted);
  text-transform: capitalize;
}

.repo-card-actions {
  display: flex;
  gap: var(--space-1);
  opacity: 0;
  transition: opacity var(--transition-fast);
}
.repo-card:hover .repo-card-actions {
  opacity: 1;
}

.repo-icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--c-text-muted);
  cursor: pointer;
  font-size: 14px;
  transition: all var(--transition-fast);
}
.repo-icon-btn:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}
.repo-icon-btn--danger:hover {
  color: var(--c-danger);
}

.repo-add-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--c-text-muted);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}
.repo-add-card:hover {
  border-color: var(--c-accent);
  color: var(--c-accent);
  background: var(--c-bg-hover);
}

/* === Right panel === */
.repo-form-panel {
  display: flex;
  flex-direction: column;
}

.form-panel-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--c-text);
  margin-bottom: var(--space-4);
}

.form-field {
  margin-bottom: var(--space-3);
}

.input-with-toggle {
  position: relative;
}
.input-with-toggle .form-field-input {
  padding-right: 40px;
}
.input-toggle-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 16px;
}
.input-toggle-btn:hover {
  color: var(--c-text);
}

.form-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-top: var(--space-4);
}

.repo-form-empty {
  align-items: center;
  justify-content: center;
  color: var(--c-text-muted);
  gap: var(--space-3);
}

.empty-icon {
  font-size: 40px;
  opacity: 0.3;
}

/* === Footer === */
.modal-footer-row {
  justify-content: space-between;
}

.footer-left {
  display: flex;
  gap: var(--space-2);
}

@media (max-width: 640px) {
  .repo-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .repo-list-panel {
    border-right: none;
    padding-right: 0;
    border-bottom: 1px solid var(--c-border);
    padding-bottom: var(--space-3);
    max-height: 200px;
  }
  .repo-card-actions {
    opacity: 1;
  }
}

.gdrive-hint {
  font-size: var(--text-sm);
  color: var(--c-text-muted);
  margin-top: var(--space-1);
  line-height: 1.4;
}

/* === Clear storage === */
.clear-storage-warning {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  background: color-mix(in srgb, var(--c-danger) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--c-danger) 25%, transparent);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}

.clear-storage-warning-icon {
  color: var(--c-danger);
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.clear-storage-warning-text {
  font-size: var(--text-sm);
  color: var(--c-text);
  line-height: 1.5;
  margin: 0;
}

.clear-storage-success {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: color-mix(in srgb, var(--c-success, #22c55e) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--c-success, #22c55e) 30%, transparent);
  border-radius: var(--radius-md);
  color: var(--c-success, #22c55e);
  font-size: var(--text-sm);
  margin-bottom: var(--space-3);
}
</style>