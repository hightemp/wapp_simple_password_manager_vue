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
        <PasswordStrengthMeter :password="newPassword" class="chpw-strength" />
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

      <div v-if="!error && isWeak && weakAcknowledged" class="weak-warning">
        <div class="i-lucide-triangle-alert" />
        <span>This password is easy to guess. Anyone who gets a copy of the encrypted database can try passwords offline — a weak one may be cracked. Use it anyway?</span>
      </div>
    </div>

    <template #footer>
      <div class="modal-footer-row">
        <button class="action-btn action-btn--ghost" @click="isOpen = false">Cancel</button>
        <button class="action-btn action-btn--primary" @click="changePassword" :disabled="isSaving">
          <div v-if="isSaving" class="i-lucide-loader-2 spin" />
          <div v-else class="i-lucide-key" />
          {{ isSaving ? 'Saving...' : isWeak && weakAcknowledged ? 'Use Weak Password' : 'Change Password' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useNotify } from '@/composables/useNotify'
import { estimateStrength, MIN_SCORE } from '@/utils/passwordStrength'
import BaseModal from './BaseModal.vue'
import PasswordStrengthMeter from './PasswordStrengthMeter.vue'

const isOpen = defineModel<boolean>({ required: true })

const db = useDatabaseStore()
const notify = useNotify()

const newPassword = ref('')
const confirmPassword = ref('')
const error = ref('')
const isSaving = ref(false)
// A weak password needs a second click
const weakAcknowledged = ref(false)
const isWeak = computed(() => estimateStrength(newPassword.value).score < MIN_SCORE)
watch(newPassword, () => { weakAcknowledged.value = false })

// Reset the form every time the modal opens
watch(isOpen, (open) => {
  if (!open) return
  newPassword.value = ''
  confirmPassword.value = ''
  error.value = ''
  isSaving.value = false
  weakAcknowledged.value = false
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
  if (isWeak.value && !weakAcknowledged.value) {
    weakAcknowledged.value = true
    return
  }

  isSaving.value = true
  // Re-encrypt and save to all repos with the new password.
  // The new password stays active even if some saves fail: repos that did save
  // already use it, and the next Save retries the failed ones.
  db.changeMasterPassword(newPassword.value)
  try {
    await db.saveToAllRepos()
    isOpen.value = false
    notify('Password Changed', 'Database re-encrypted with the new password', 'success')
  } catch (e) {
    isOpen.value = false
    notify(
      'Password changed, but not saved everywhere',
      (e instanceof Error ? e.message : String(e)) +
        '. These repositories still use the OLD password until you press Save again.',
      'error',
      15000,
    )
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

.chpw-hint {
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
  margin: 0;
}

.chpw-strength {
  margin-top: var(--space-2);
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
</style>
