<template>
  <div class="form-field" :data-field="fieldKey">
    <label v-if="!hideLabel" class="form-field-label" :for="inputId">{{ field.label }}</label>

    <!-- category path with suggestions -->
    <CategoryInput v-if="field.kind === 'category'" v-model="model" />

    <!-- multi-line text -->
    <div v-else-if="field.kind === 'multiline'" class="form-field-control form-field-control--textarea">
      <textarea
        :id="inputId"
        v-model="model"
        class="form-field-input form-field-textarea"
        rows="4"
        :placeholder="field.placeholder"
        autocomplete="off"
      />
      <div class="form-field-actions">
        <button type="button" class="form-field-btn" :disabled="!model" :aria-label="`Copy ${field.label}`" :title="`Copy ${field.label}`" @click="copy">
          <div :class="isCopied ? 'i-lucide-check' : 'i-lucide-copy'" />
        </button>
      </div>
    </div>

    <!-- secret multi-line text: hidden behind a placeholder until shown -->
    <div v-else-if="field.kind === 'secret_multiline'" class="form-field-control form-field-control--textarea form-field-control--secret">
      <textarea
        v-if="isRevealed"
        :id="inputId"
        v-model="model"
        class="form-field-input form-field-textarea"
        rows="6"
        :placeholder="field.placeholder"
        autocomplete="off"
      />
      <button v-else type="button" class="form-field-input form-field-hidden-text" @click="isRevealed = true">
        {{ model ? `•••••••• (${lineCount} line${lineCount === 1 ? '' : 's'})` : 'Empty — click to write' }}
      </button>
      <div class="form-field-actions">
        <button type="button" class="form-field-btn" :aria-label="isRevealed ? `Hide ${field.label}` : `Show ${field.label}`" @click="isRevealed = !isRevealed">
          <div :class="isRevealed ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
        </button>
        <button type="button" class="form-field-btn" :disabled="!model" :aria-label="`Copy ${field.label}`" :title="`Copy ${field.label}`" @click="copy">
          <div :class="isCopied ? 'i-lucide-check' : 'i-lucide-copy'" />
        </button>
      </div>
    </div>

    <!-- single-line inputs -->
    <template v-else>
      <div :class="['form-field-control', { 'form-field-control--secret': isSecret }]">
        <input
          :id="inputId"
          :type="inputType"
          :value="model"
          class="form-field-input"
          :placeholder="field.placeholder"
          :inputmode="inputMode"
          :maxlength="field.kind === 'month_year' ? 5 : undefined"
          autocomplete="off"
          @input="onInput"
        />
        <div class="form-field-actions">
          <button
            v-if="isSecret"
            type="button"
            class="form-field-btn"
            :aria-label="isRevealed ? `Hide ${field.label}` : `Show ${field.label}`"
            :title="isRevealed ? 'Hide' : 'Show'"
            @click="isRevealed = !isRevealed"
          >
            <div :class="isRevealed ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
          </button>
          <button type="button" class="form-field-btn" :disabled="!model" :aria-label="`Copy ${field.label}`" :title="`Copy ${field.label}`" @click="copy">
            <div :class="isCopied ? 'i-lucide-check' : 'i-lucide-copy'" />
          </button>
        </div>
      </div>
      <span v-if="cardHint" :class="['form-field-hint', { 'form-field-hint--error': cardHint.error }]">{{ cardHint.text }}</span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId } from 'vue'
import { copySecret, CLIPBOARD_CLEAR_DELAY } from '@/utils/clipboard'
import { useNotify } from '@/composables/useNotify'
import { cardBrand, digitsOnly, formatCardNumber, formatExpiry, isValidCardNumber } from '@/utils/card'
import type { FieldKind } from '@/types/entryTypes'
import CategoryInput from './CategoryInput.vue'

const props = defineProps<{
  field: { label: string; kind: FieldKind | 'category'; placeholder?: string }
  modelValue: string | undefined
  // Storage key, exposed as data-field for tests and styling
  fieldKey?: string
  hideLabel?: boolean
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const inputId = useId()
const notify = useNotify()

const model = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value),
})

// Secrets are masked until the user asks to see them
const isSecret = computed(() => props.field.kind === 'secret' || props.field.kind === 'card_number')
const isRevealed = ref(false)

const INPUT_TYPES: Partial<Record<FieldKind, string>> = { url: 'url', email: 'email', phone: 'tel', date: 'date' }
const inputType = computed(() => {
  if (isSecret.value) return isRevealed.value ? 'text' : 'password'
  return INPUT_TYPES[props.field.kind as FieldKind] ?? 'text'
})
const inputMode = computed(() =>
  props.field.kind === 'card_number' || props.field.kind === 'month_year' ? 'numeric' : undefined
)

const lineCount = computed(() => model.value.split('\n').length)

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  let value = input.value
  if (props.field.kind === 'card_number') value = formatCardNumber(value)
  if (props.field.kind === 'month_year') value = formatExpiry(value)
  if (value !== input.value) input.value = value
  model.value = value
}

const cardHint = computed(() => {
  if (props.field.kind !== 'card_number' || digitsOnly(model.value).length < 12) return null
  if (!isValidCardNumber(model.value)) return { text: 'This card number has a typo (checksum does not match)', error: true }
  const brand = cardBrand(model.value)
  return brand ? { text: brand, error: false } : null
})

const isCopied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  const text = props.field.kind === 'card_number' ? digitsOnly(model.value) : model.value
  if (!text) return
  try {
    await copySecret(text)
  } catch (_) {
    notify('Copy failed', 'The browser blocked clipboard access', 'error')
    return
  }
  isCopied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { isCopied.value = false }, 1500)
  notify('Copied', `Clipboard will be cleared in ${CLIPBOARD_CLEAR_DELAY / 1000} s`, 'success', 2000)
}

onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<style scoped>
.form-field {
  margin-bottom: var(--space-4);
}

.form-field-control {
  position: relative;
}

.form-field-control .form-field-input {
  padding-right: 40px;
}

.form-field-control--secret .form-field-input {
  padding-right: 72px;
  font-family: var(--font-mono);
}

.form-field-actions {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  display: flex;
}

.form-field-control--textarea .form-field-actions {
  top: 4px;
  transform: none;
}

.form-field-btn {
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

.form-field-btn:hover:not(:disabled) {
  color: var(--c-text);
  background: var(--c-bg-hover);
}

.form-field-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.form-field-textarea {
  height: auto;
  padding: var(--space-2) var(--space-3);
  resize: vertical;
  min-height: 80px;
}

.form-field-hidden-text {
  display: flex;
  align-items: center;
  height: 80px;
  text-align: left;
  color: var(--c-text-muted);
  letter-spacing: 1px;
  cursor: pointer;
}

.form-field-hint {
  display: block;
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--c-text-secondary);
}
.form-field-hint--error {
  color: var(--c-danger);
}
</style>
