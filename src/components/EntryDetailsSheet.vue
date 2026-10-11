<template>
  <BaseModal
    :model-value="entry !== null"
    :title="entry?.name || '(no name)'"
    size="md"
    @update:model-value="(open) => !open && emit('close')"
  >
    <dl v-if="entry" class="details">
      <template v-for="(column, key) in columns" :key="key">
        <!-- Name is already the sheet title -->
        <div v-if="entry[key] && key !== 'name'" class="details-row" :data-field="key">
          <dt class="details-label">{{ column.label }}</dt>
          <dd class="details-value">
            <!-- Password -->
            <template v-if="key === 'password'">
              <span :class="['details-text', 'details-secret', { masked: !isPasswordVisible }]">
                {{ isPasswordVisible ? entry[key] : '••••••••' }}
              </span>
              <button class="details-btn" :aria-label="isPasswordVisible ? 'Hide password' : 'Show password'" @click="isPasswordVisible = !isPasswordVisible">
                <div :class="isPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
              </button>
              <button class="details-btn" aria-label="Copy password" @click="emit('copy', 'password')">
                <div class="i-lucide-copy" />
              </button>
            </template>
            <!-- Login -->
            <template v-else-if="key === 'login'">
              <span class="details-text">{{ entry[key] }}</span>
              <button class="details-btn" aria-label="Copy login" @click="emit('copy', 'login')">
                <div class="i-lucide-copy" />
              </button>
            </template>
            <!-- URL -->
            <template v-else-if="key === 'url'">
              <a :href="entry[key]" target="_blank" rel="noopener" class="details-text details-link">{{ entry[key] }}</a>
              <a :href="entry[key]" target="_blank" rel="noopener" class="details-btn" aria-label="Open URL">
                <div class="i-lucide-external-link" />
              </a>
            </template>
            <!-- Everything else, incl. multi-line description -->
            <span v-else class="details-text details-multiline">{{ entry[key] }}</span>
          </dd>
        </div>
      </template>
    </dl>

    <template #footer>
      <div class="modal-footer-row details-actions">
        <button class="action-btn action-btn--danger" @click="emit('delete')">
          <div class="i-lucide-trash-2" /> Delete
        </button>
        <button class="action-btn action-btn--primary" @click="emit('edit')">
          <div class="i-lucide-pencil" /> Edit
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { COLUMNS, type Entry } from '@/stores/database'
import BaseModal from './BaseModal.vue'

const props = defineProps<{
  // Sheet is shown while an entry is set
  entry: Entry | null
}>()

const emit = defineEmits<{
  (e: 'copy', field: 'login' | 'password'): void
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'close'): void
}>()

const columns = COLUMNS
const isPasswordVisible = ref(false)

// Always open with the password hidden
watch(() => props.entry, () => { isPasswordVisible.value = false })
</script>

<style scoped>
.details {
  display: flex;
  flex-direction: column;
}

.details-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--c-border);
}
.details-row:last-child {
  border-bottom: none;
}

.details-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.details-value {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 44px;
  margin: 0;
}

.details-text {
  flex: 1;
  min-width: 0;
  font-size: var(--text-lg);
  color: var(--c-text);
  overflow-wrap: anywhere;
}

.details-secret {
  font-family: var(--font-mono);
}
.details-secret.masked {
  letter-spacing: 2px;
  color: var(--c-text-muted);
}

.details-link {
  color: var(--c-accent);
}

.details-multiline {
  white-space: pre-wrap;
  padding: var(--space-2) 0;
}

.details-btn {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
  font-size: 20px;
  text-decoration: none;
}
.details-btn:active {
  background: var(--c-bg-hover);
}

.details-actions {
  justify-content: space-between;
}
.details-actions .action-btn {
  flex: 1;
  justify-content: center;
  min-height: 44px;
}
</style>
