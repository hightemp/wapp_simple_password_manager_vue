<template>
<BaseModal v-model="bShowRepoWindow" title="Repository Settings" size="lg" :persistent="true" :closable="false">
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
          v-model="sPassword"
        />
      </div>

      <!-- Repo list -->
      <div class="repo-list">
        <div
          v-for="(oItem, iIndex) in aReposList"
          :key="iIndex"
          :class="['repo-card', { active: iSelectedRepoIndex === iIndex }]"
          @click="fnSelectRepo(iIndex)"
        >
          <template v-if="oItem">
            <div class="repo-card-icon">
              <div v-if="oItem.type === 'github'" class="i-lucide-github" />
              <div v-else-if="oItem.type === 'webdav'" class="i-lucide-cloud" />
              <div v-else class="i-lucide-hard-drive" />
            </div>
            <div class="repo-card-info">
              <div class="repo-card-name">{{ oItem.name }}</div>
              <div class="repo-card-type">{{ oItem.type }}</div>
            </div>
            <div class="repo-card-actions" v-if="oItem.type !== 'localstorage'">
              <button class="repo-icon-btn" @click.stop="fnEditRepo(iIndex)" title="Edit" aria-label="Edit repository">
                <div class="i-lucide-pencil" />
              </button>
              <button class="repo-icon-btn repo-icon-btn--danger" @click.stop="fnRemoveRepo(iIndex)" title="Delete" aria-label="Delete repository">
                <div class="i-lucide-trash-2" />
              </button>
            </div>
          </template>
        </div>

        <!-- Add button -->
        <button class="repo-add-card" @click="fnNewRepo">
          <div class="i-lucide-plus" />
          <span>Add Repository</span>
        </button>
      </div>
    </div>

    <!-- === Right: edit form === -->
    <div class="repo-form-panel" v-if="iEditIndex !== null">
      <h3 class="form-panel-title">{{ iEditIndex === -1 ? 'New Repository' : 'Edit Repository' }}</h3>

      <div class="form-field">
        <label class="form-field-label">Type</label>
        <select class="form-field-input" v-model="sFromType">
          <option value="github">GitHub</option>
          <option value="webdav">WebDAV</option>
        </select>
      </div>

      <div class="form-field">
        <label class="form-field-label">Name</label>
        <input type="text" :class="['form-field-input', { 'input-error': formErrors.name }]" v-model="sFormName" placeholder="My Repository" />
        <span v-if="formErrors.name" class="field-error">{{ formErrors.name }}</span>
      </div>

      <template v-if="sFromType === 'github'">
        <div class="form-field">
          <label class="form-field-label">Login</label>
          <input type="text" :class="['form-field-input', { 'input-error': formErrors.login }]" v-model="sFormLogin" placeholder="username" />
          <span v-if="formErrors.login" class="field-error">{{ formErrors.login }}</span>
        </div>
        <div class="form-field">
          <label class="form-field-label">Repository</label>
          <input type="text" :class="['form-field-input', { 'input-error': formErrors.repo }]" v-model="sFormRepo" placeholder="repo-name" />
          <span v-if="formErrors.repo" class="field-error">{{ formErrors.repo }}</span>
        </div>
        <div class="form-field">
          <label class="form-field-label">API Key</label>
          <div class="input-with-toggle">
            <input :type="bShowApiKey ? 'text' : 'password'" :class="['form-field-input', { 'input-error': formErrors.key }]" v-model="sFormKey" placeholder="ghp_..." />
            <button class="input-toggle-btn" @click="bShowApiKey = !bShowApiKey" type="button" :aria-label="bShowApiKey ? 'Hide' : 'Show'">
              <div :class="bShowApiKey ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
            </button>
          </div>
          <span v-if="formErrors.key" class="field-error">{{ formErrors.key }}</span>
        </div>
      </template>

      <template v-if="sFromType === 'webdav'">
        <div class="form-field">
          <label class="form-field-label">URL</label>
          <input type="url" :class="['form-field-input', { 'input-error': formErrors.url }]" v-model="sFormURL" placeholder="https://..." />
          <span v-if="formErrors.url" class="field-error">{{ formErrors.url }}</span>
        </div>
        <div class="form-field">
          <label class="form-field-label">Username</label>
          <input type="text" :class="['form-field-input', { 'input-error': formErrors.username }]" v-model="sFormUsername" />
          <span v-if="formErrors.username" class="field-error">{{ formErrors.username }}</span>
        </div>
        <div class="form-field">
          <label class="form-field-label">Password</label>
          <div class="input-with-toggle">
            <input :type="bShowWdPw ? 'text' : 'password'" :class="['form-field-input', { 'input-error': formErrors.password }]" v-model="sFormPassword" />
            <button class="input-toggle-btn" @click="bShowWdPw = !bShowWdPw" type="button" :aria-label="bShowWdPw ? 'Hide' : 'Show'">
              <div :class="bShowWdPw ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
            </button>
          </div>
          <span v-if="formErrors.password" class="field-error">{{ formErrors.password }}</span>
        </div>
      </template>

      <div class="form-actions">
        <button class="action-btn action-btn--ghost" @click="fnCancelRepo">Cancel</button>
        <button class="action-btn action-btn--primary" @click="fnSaveRepo">Save</button>
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
        <button class="action-btn action-btn--ghost action-btn--sm" @click="fnExport" title="Export repositories">
          <div class="i-lucide-download" /> Export
        </button>
        <button class="action-btn action-btn--danger action-btn--sm" @click="fnCleanRepo" title="Clear all">
          <div class="i-lucide-trash-2" /> Clear
        </button>
      </div>
      <button class="action-btn action-btn--primary" @click="fnAcceptRepo">
        <div class="i-lucide-log-in" /> Connect
      </button>
    </div>
  </template>
</BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useDatabaseStore } from '../stores/database'
import { useReposStore } from '../stores/repos'
import { fnSaveFile } from '../lib'
import BaseModal from './BaseModal.vue'

const db = useDatabaseStore()
const repos = useReposStore()

const bShowRepoWindow = computed({
  get: () => db.bShowRepoWindow,
  set: (v) => { db.bShowRepoWindow = v },
})

const sPassword = computed({
  get: () => db.sPassword,
  set: (v) => { db.sPassword = v },
})

const iSelectedRepoIndex = computed(() => repos.iSelectedRepoIndex)
const aReposList = computed(() => repos.aAllRepos)

const iEditIndex = ref<number | null>(null)
const sFormLogin = ref('')
const sFormRepo = ref('')
const sFormKey = ref('')
const sFormURL = ref('')
const sFromType = ref('github')
const sFormName = ref('')
const sFormUsername = ref('')
const sFormPassword = ref('')
const bShowApiKey = ref(false)
const bShowWdPw = ref(false)
const formErrors = reactive<Record<string, string>>({})

function fnValidateRepo(): boolean {
  // Clear previous errors
  for (const k in formErrors) delete formErrors[k]

  if (!sFormName.value.trim()) {
    formErrors.name = 'Name is required'
  }

  if (sFromType.value === 'github') {
    if (!sFormLogin.value.trim()) formErrors.login = 'Login is required'
    if (!sFormRepo.value.trim()) formErrors.repo = 'Repository is required'
    if (!sFormKey.value.trim()) {
      formErrors.key = 'API Key is required'
    } else if (!/^(ghp_|github_pat_)/.test(sFormKey.value.trim())) {
      formErrors.key = 'API Key should start with ghp_ or github_pat_'
    }
  }

  if (sFromType.value === 'webdav') {
    if (!sFormURL.value.trim()) {
      formErrors.url = 'URL is required'
    } else {
      try { new URL(sFormURL.value.trim()) } catch { formErrors.url = 'Invalid URL format' }
    }
    if (!sFormUsername.value.trim()) formErrors.username = 'Username is required'
    if (!sFormPassword.value.trim()) formErrors.password = 'Password is required'
  }

  return Object.keys(formErrors).length === 0
}

function fnSaveRepo() {
  if (!fnValidateRepo()) return
  const oObj = {
    name: sFormName.value,
    login: sFormLogin.value,
    repo: sFormRepo.value,
    key: sFormKey.value,
    type: sFromType.value,
    url: sFormURL.value,
    username: sFormUsername.value,
    password: sFormPassword.value,
  }
  repos.fnReposUpdate({ iIndex: iEditIndex.value, oObj })
  iEditIndex.value = null
}

function fnNewRepo() {
  iEditIndex.value = -1
  sFormName.value = ''
  sFormLogin.value = ''
  sFormRepo.value = ''
  sFormKey.value = ''
  sFromType.value = 'github'
  sFormURL.value = ''
  sFormUsername.value = ''
  sFormPassword.value = ''
}

function fnEditRepo(iIndex: number) {
  iEditIndex.value = iIndex
  const oO = aReposList.value[iEditIndex.value]
  sFormName.value = oO.name
  sFormLogin.value = oO.login
  sFormRepo.value = oO.repo
  sFormKey.value = oO.key
  sFromType.value = oO.type
  sFormURL.value = oO.url
  sFormUsername.value = oO.username
  sFormPassword.value = oO.password
}

function fnRemoveRepo(iIndex: number) { repos.fnReposRemove(iIndex) }
function fnSelectRepo(iIndex: number) { repos.fnReposSelect(iIndex) }
function fnCleanRepo() { repos.fnReposClean() }
function fnCancelRepo() { iEditIndex.value = null }

function fnAcceptRepo() {
  if (!aReposList.value[iSelectedRepoIndex.value]) {
    return alert('Please select a repository')
  }
  db.bShowRepoWindow = false
  db.fnPrepareRepo()
}

function fnExport() {
  fnSaveFile('database', JSON.stringify(repos.aAllRepos))
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

.form-field-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--c-text-secondary);
  margin-bottom: var(--space-1);
}

.form-field-input {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.form-field-input:focus {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.input-error {
  border-color: var(--c-danger) !important;
}
.input-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
}

.field-error {
  display: block;
  font-size: var(--text-xs);
  color: var(--c-danger);
  margin-top: var(--space-1);
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

/* === Action buttons === */
.action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.action-btn--sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
}

.action-btn--primary {
  background: var(--c-accent);
  color: white;
}
.action-btn--primary:hover {
  background: var(--c-accent-hover);
}

.action-btn--ghost {
  background: transparent;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
}
.action-btn--ghost:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}

.action-btn--danger {
  background: transparent;
  color: var(--c-danger);
  border: 1px solid var(--c-border);
}
.action-btn--danger:hover {
  background: var(--c-danger);
  color: white;
}

/* === Footer === */
.modal-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
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
</style>