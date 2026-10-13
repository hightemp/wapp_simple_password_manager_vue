<template>
  <BaseModal
    :model-value="db.isCreatePending"
    title="Create a new database"
    size="sm"
    persistent
    :closable="false"
  >
    <div class="create-db">
      <p class="create-db-text">
        There is no password database in <strong>{{ repos.currentRepo?.name }}</strong> yet.
        A new one will be encrypted with the master password you entered.
      </p>

      <div class="form-field">
        <label class="form-field-label">Master password strength</label>
        <PasswordStrengthMeter :password="db.masterPassword" />
      </div>

      <div class="form-field">
        <label class="form-field-label" :for="repeatId">Repeat master password</label>
        <input
          :id="repeatId"
          v-model="repeat"
          type="password"
          :class="['form-field-input', { 'input-error': mismatch }]"
          placeholder="Type it again"
          autocomplete="new-password"
          @keydown.enter.prevent="create"
        />
        <span v-if="mismatch" class="field-error">Passwords do not match</span>
      </div>

      <div v-if="isWeak" class="weak-warning">
        <div class="i-lucide-triangle-alert" />
        <span>This password is easy to guess. Anyone who gets a copy of the encrypted database can try passwords offline — a weak one may be cracked. Go back to choose a stronger one, or use it anyway.</span>
      </div>
      <p class="create-db-note">There is no way to recover the data without the master password.</p>
    </div>

    <template #footer>
      <div class="modal-footer-row">
        <button class="action-btn action-btn--ghost" @click="db.cancelCreateDatabase()">Back</button>
        <button class="action-btn action-btn--primary" :disabled="!repeat" @click="create">
          <div class="i-lucide-database" /> {{ isWeak ? 'Create Anyway' : 'Create' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useReposStore } from '@/stores/repos'
import { estimateStrength, MIN_SCORE } from '@/utils/passwordStrength'
import BaseModal from './BaseModal.vue'
import PasswordStrengthMeter from './PasswordStrengthMeter.vue'

const db = useDatabaseStore()
const repos = useReposStore()
const repeatId = useId()

const repeat = ref('')
const submitted = ref(false)
const isWeak = computed(() => estimateStrength(db.masterPassword).score < MIN_SCORE)
const mismatch = computed(() => submitted.value && repeat.value !== db.masterPassword)

watch(() => db.isCreatePending, () => {
  repeat.value = ''
  submitted.value = false
})

function create() {
  submitted.value = true
  if (!repeat.value || mismatch.value) return
  db.createDatabase()
}
</script>

<style scoped>
.create-db {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.create-db .form-field {
  margin-bottom: 0;
}

.create-db-text,
.create-db-note {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

.create-db-note {
  font-size: var(--text-xs);
  color: var(--c-text-muted);
}
</style>
