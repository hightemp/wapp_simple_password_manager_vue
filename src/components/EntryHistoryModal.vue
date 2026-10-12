<template>
  <BaseModal
    :model-value="entry !== null"
    :title="`History: ${entry?.name || '(no name)'}`"
    size="md"
    @update:model-value="(open) => !open && emit('close')"
  >
    <p v-if="versions.length === 0" class="history-empty">
      No changes yet. Previous values appear here after the entry is edited.
    </p>

    <section v-for="version in versions" :key="version.index" class="history-version">
      <header class="history-version-header">
        <span class="history-date">{{ formatDate(version.at) }}</span>
        <button
          class="action-btn action-btn--ghost action-btn--sm"
          :disabled="isCurrent(version.fields)"
          aria-label="Restore version"
          @click="emit('restore', { ...version.fields })"
        >
          <div class="i-lucide-undo-2" /> Restore
        </button>
      </header>

      <div v-for="(value, field) in version.fields" :key="field" class="history-field" :data-field="field">
        <span class="history-label">{{ label(field) }}</span>
        <span
          :class="['history-value', {
            'history-value--secret': isSecret(field),
            'history-value--masked': isSecret(field) && !isRevealed(version.index, field),
            'history-value--empty': !value,
          }]"
        >
          {{ !value ? '(empty)' : isSecret(field) && !isRevealed(version.index, field) ? '••••••••' : value }}
        </span>
        <span class="history-field-actions">
          <button
            v-if="isSecret(field) && value"
            class="history-btn"
            :aria-label="isRevealed(version.index, field) ? `Hide ${label(field)}` : `Show ${label(field)}`"
            @click="toggleRevealed(version.index, field)"
          >
            <div :class="isRevealed(version.index, field) ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
          </button>
          <button v-if="value" class="history-btn" :aria-label="`Copy ${label(field)}`" @click="copy(value)">
            <div class="i-lucide-copy" />
          </button>
          <button
            class="history-btn"
            :disabled="isCurrent({ [field]: value })"
            :aria-label="`Restore ${label(field)}`"
            title="Restore this field"
            @click="emit('restore', { [field]: value })"
          >
            <div class="i-lucide-undo-2" />
          </button>
        </span>
      </div>
    </section>

    <template #footer>
      <div class="modal-footer-row">
        <button v-if="versions.length" class="action-btn action-btn--danger history-clear" @click="clearHistory">
          <div class="i-lucide-trash-2" /> Clear history
        </button>
        <button class="action-btn action-btn--primary" @click="emit('close')">Close</button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { COLUMNS, type Entry } from '@/stores/database'
import { copySecret, CLIPBOARD_CLEAR_DELAY } from '@/utils/clipboard'
import { useNotify } from '@/composables/useNotify'
import { useConfirm } from '@/composables/useConfirm'
import BaseModal from './BaseModal.vue'

const props = defineProps<{
  // Modal is shown while an entry is set
  entry: Entry | null
  // Values to compare with (the edit form passes its unsaved values); defaults to the entry
  current?: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'restore', fields: Record<string, string>): void
  (e: 'clear'): void
  (e: 'close'): void
}>()

const notify = useNotify()
const confirmAction = useConfirm()

// Newest first; `index` is the position in entry.history
const versions = computed(() =>
  (props.entry?.history ?? []).map((version, index) => ({ ...version, index })).reverse()
)

// Revealed secrets, keyed "<version index>:<field>"
const revealed = reactive(new Set<string>())
watch(() => props.entry, () => revealed.clear())

function label(field: string): string {
  return COLUMNS[field]?.label ?? field
}

function isSecret(field: string): boolean {
  return COLUMNS[field]?.type === 'password'
}

function isRevealed(index: number, field: string): boolean {
  return revealed.has(`${index}:${field}`)
}

function toggleRevealed(index: number, field: string) {
  const key = `${index}:${field}`
  if (revealed.has(key)) revealed.delete(key)
  else revealed.add(key)
}

/** Do the given values already match the current ones (nothing to restore)? */
function isCurrent(fields: Record<string, string>): boolean {
  const current = props.current ?? props.entry ?? {}
  return Object.entries(fields).every(([field, value]) => (current[field] ?? '') === value)
}

function formatDate(at: number): string {
  return new Date(at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

async function copy(text: string) {
  try {
    await copySecret(text)
  } catch (_) {
    notify('Copy failed', 'The browser blocked clipboard access', 'error')
    return
  }
  notify('Copied', `Clipboard will be cleared in ${CLIPBOARD_CLEAR_DELAY / 1000} s`, 'success', 2000)
}

async function clearHistory() {
  const confirmed = await confirmAction({
    title: 'Clear history',
    message: 'Delete all previous values of this entry? Old passwords are removed for good.',
    confirmText: 'Clear',
    danger: true,
  })
  if (confirmed) emit('clear')
}
</script>

<style scoped>
.history-clear {
  margin-right: auto;
}

.history-empty {
  margin: 0;
  color: var(--c-text-muted);
  font-size: var(--text-sm);
}

.history-version {
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--c-border);
}
.history-version:first-of-type {
  padding-top: 0;
}
.history-version:last-of-type {
  border-bottom: none;
}

.history-version-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.history-date {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--c-text);
}

.history-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
}

.history-label {
  flex-shrink: 0;
  width: 96px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.history-value {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--c-text);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.history-value--secret {
  font-family: var(--font-mono);
}
.history-value--masked {
  letter-spacing: 2px;
  color: var(--c-text-muted);
}
.history-value--empty {
  color: var(--c-text-muted);
  font-style: italic;
}

.history-field-actions {
  display: flex;
  flex-shrink: 0;
}

.history-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  border-radius: var(--radius-sm);
  font-size: 16px;
  cursor: pointer;
}
.history-btn:hover:not(:disabled) {
  background: var(--c-bg-hover);
  color: var(--c-text);
}
.history-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

@media (max-width: 768px) {
  .history-field {
    flex-wrap: wrap;
  }
  .history-label {
    width: 100%;
  }
  .history-btn {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }
}
</style>
