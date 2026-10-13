<template>
  <BaseModal
    :model-value="entry !== null"
    :title="entry?.name || '(no name)'"
    size="md"
    @update:model-value="(open) => !open && emit('close')"
  >
    <dl v-if="entry" class="details">
      <div class="details-type">
        <div :class="type.icon" /> {{ type.label }}
      </div>

      <!-- Category: shown even when empty, with a button to move the entry -->
      <div class="details-row" data-field="category">
        <dt class="details-label">Category</dt>
        <dd class="details-value">
          <span :class="['details-text', { 'details-empty': !entry.category }]">{{ entry.category || 'Uncategorized' }}</span>
          <button v-if="!inTrash" class="details-btn" aria-label="Change category" @click="emit('change-category')">
            <div class="i-lucide-folder-input" />
          </button>
        </dd>
      </div>

      <template v-for="field in fields" :key="field.key">
        <div v-if="entry[field.key]" class="details-row" :data-field="field.key">
          <dt class="details-label">{{ field.label }}</dt>
          <dd class="details-value">
            <!-- Secrets: masked until shown -->
            <template v-if="isSecretKind(field.kind)">
              <span :class="['details-text', 'details-secret', { masked: !revealed.has(field.key), 'details-multiline': field.kind === 'secret_multiline' && revealed.has(field.key) }]">
                {{ revealed.has(field.key) ? display(field) : '••••••••' }}
              </span>
              <button class="details-btn" :aria-label="revealed.has(field.key) ? `Hide ${field.label.toLowerCase()}` : `Show ${field.label.toLowerCase()}`" @click="toggle(field.key)">
                <div :class="revealed.has(field.key) ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
              </button>
            </template>
            <!-- Links -->
            <template v-else-if="field.kind === 'url' || field.kind === 'email' || field.kind === 'phone'">
              <a :href="href(field)" target="_blank" rel="noopener" class="details-text details-link">{{ entry[field.key] }}</a>
            </template>
            <span v-else :class="['details-text', { 'details-multiline': field.kind === 'multiline' }]">{{ display(field) }}</span>

            <a v-if="field.kind === 'url'" :href="entry[field.key]" target="_blank" rel="noopener" class="details-btn" aria-label="Open URL">
              <div class="i-lucide-external-link" />
            </a>
            <button v-else class="details-btn" :aria-label="`Copy ${field.label.toLowerCase()}`" @click="emit('copy', field.key)">
              <div class="i-lucide-copy" />
            </button>
          </dd>
        </div>
      </template>
    </dl>

    <template #footer>
      <div v-if="inTrash" class="modal-footer-row details-actions">
        <button class="action-btn action-btn--danger" @click="emit('delete')">
          <div class="i-lucide-trash-2" /> Delete forever
        </button>
        <button class="action-btn action-btn--primary" @click="emit('restore')">
          <div class="i-lucide-undo-2" /> Restore
        </button>
      </div>
      <div v-else class="modal-footer-row details-actions">
        <button class="action-btn action-btn--danger" @click="emit('delete')">
          <div class="i-lucide-trash-2" /> Delete
        </button>
        <button class="action-btn action-btn--ghost" aria-label="History" @click="emit('history')">
          <div class="i-lucide-history" /> History
        </button>
        <button class="action-btn action-btn--primary" @click="emit('edit')">
          <div class="i-lucide-pencil" /> Edit
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { Entry } from '@/stores/database'
import { entryType, entryFields, isSecretKind, formatDate, type FieldDef } from '@/types/entryTypes'
import { formatCardNumber } from '@/utils/card'
import BaseModal from './BaseModal.vue'

const props = defineProps<{
  // Sheet is shown while an entry is set
  entry: Entry | null
  // A deleted entry: restore / delete forever instead of edit / delete
  inTrash?: boolean
}>()

const emit = defineEmits<{
  (e: 'copy', field: string): void
  (e: 'edit'): void
  (e: 'change-category'): void
  (e: 'delete'): void
  (e: 'history'): void
  (e: 'restore'): void
  (e: 'close'): void
}>()

const type = computed(() => entryType(props.entry))
// Fields of the entry except Name (it is the sheet title)
const fields = computed(() => (props.entry ? entryFields(props.entry, type.value) : []))

// Revealed secrets; the sheet always opens with all of them hidden
const revealed = reactive(new Set<string>())
watch(() => props.entry, () => revealed.clear())

function toggle(key: string) {
  if (revealed.has(key)) revealed.delete(key)
  else revealed.add(key)
}

function display(field: FieldDef): string {
  const value = props.entry?.[field.key] ?? ''
  if (field.kind === 'date') return formatDate(value)
  if (field.kind === 'card_number') return formatCardNumber(value)
  return value
}

function href(field: FieldDef): string {
  const value = props.entry?.[field.key] ?? ''
  if (field.kind === 'email') return `mailto:${value}`
  if (field.kind === 'phone') return `tel:${value.replace(/[^\d+]/g, '')}`
  return value
}
</script>

<style scoped>
.details {
  display: flex;
  flex-direction: column;
}

.details-type {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--c-accent);
  font-weight: 600;
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

.details-empty {
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
