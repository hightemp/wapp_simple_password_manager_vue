<template>
  <BaseModal v-model="isOpen" title="Change Master Password" size="md" :closable="true">
    <div class="chpw-form">
      <p class="chpw-hint">The database will be re-encrypted with the new password and saved to all connected repositories.</p>

      <div class="form-field">
        <label class="form-field-label">Current Password</label>
        <input type="password" class="form-field-input" :value="db.masterPassword" readonly autocomplete="off" />
      </div>

      <div class="form-field">
        <label class="form-field-label">New Password</label>
        <input type="password" class="form-field-input" v-model="newPassword" autocomplete="off"
          :class="{ 'input-error': error && !newPassword }" placeholder="Enter new password" />
      </div>

      <div class="form-field">
        <label class="form-field-label">Confirm New Password</label>
        <input type="password" class="form-field-input" v-model="confirmPassword" autocomplete="off"
          :class="{ 'input-error': error && newPassword !== confirmPassword }" placeholder="Repeat new password" />
      </div>

      <Transition name="error-slide">
        <div v-if="error" class="chpw-error">
          <div class="i-lucide-alert-circle" />
          <span>{{ error }}</span>
        </div>
      </Transition>
    </div>

    <template #footer>
      <div class="modal-footer-row">
        <button class="action-btn action-btn--ghost" @click="isOpen = false">Cancel</button>
        <button class="action-btn action-btn--primary" @click="changePassword" :disabled="isSaving">
          <div v-if="isSaving" class="i-lucide-loader-2 spin" />
          <div v-else class="i-lucide-key" />
          {{ isSaving ? 'Saving...' : 'Change Password' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useNotify } from '@/composables/useNotify'
import BaseModal from './BaseModal.vue'

const isOpen = defineModel<boolean>({ required: true })

const db = useDatabaseStore()
const notify = useNotify()

const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const isSaving = ref(false)

// Reset the form every time the modal opens
watch(isOpen, (open) => {
  if (!open) return
  newPassword.value = ''
  confirmPassword.value = ''
  error.value = ''
  isSaving.value = false
})

function validate(): string {
  if (!newPassword.value) return 'New password is required'
  if (newPassword.value.length < 4) return 'Password must be at least 4 characters'
  if (newPassword.value !== confirmPassword.value) return 'Passwords do not match'
  if (newPassword.value === db.masterPassword) return 'New password must be different from the current one'
  return ''
}

async function changePassword() {
  error.value = validate()
  if (error.value) return

  isSaving.value = true
  try {
    // Re-encrypt and save to all repos with the new password
    db.masterPassword = newPassword.value
    await db.saveToAllRepos()
    isOpen.value = false
    notify('Password Changed', 'Database re-encrypted with the new password', 'success')
  } catch (e) {
    error.value = 'Failed to save: ' + e
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
/* ===== Change Password Modal ===== */
.chpw-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.chpw-form .form-field {
  margin-bottom: 0;
}

.chpw-form .form-field-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--c-text-secondary);
  margin-bottom: var(--space-1);
}

.chpw-form .form-field-input {
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
.chpw-form .form-field-input:focus {
  border-color: var(--c-accent);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.chpw-form .form-field-input[readonly] {
  opacity: 0.6;
  cursor: not-allowed;
}

.chpw-form .input-error {
  border-color: var(--c-danger) !important;
}
.chpw-form .input-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
}

.chpw-hint {
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
  margin: 0;
}

.chpw-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: color-mix(in srgb, var(--c-danger) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--c-danger) 30%, transparent);
  border-radius: var(--radius-md);
  color: var(--c-danger);
  font-size: var(--text-sm);
}
/* ===== Modal shared (footer & buttons) ===== */
.modal-footer-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  width: 100%;
}

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
.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.action-btn--primary {
  background: var(--c-accent);
  color: white;
}
.action-btn--primary:hover:not(:disabled) {
  background: var(--c-accent-hover);
}

.action-btn--ghost {
  background: transparent;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
}
.action-btn--ghost:hover:not(:disabled) {
  background: var(--c-bg-hover);
  color: var(--c-text);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.spin { animation: spin 1s linear infinite; }
</style>
