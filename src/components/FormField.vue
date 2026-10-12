<template>
  <div class="form-field">
    <label class="form-field-label">{{ field.label }}</label>

    <!-- textarea -->
    <div v-if="field.type === 'textarea'" class="form-field-control form-field-control--textarea">
      <textarea
        class="form-field-input form-field-textarea"
        rows="4"
        :placeholder="field.placeholder"
        v-model="model"
        autocomplete="off"
      />
      <div class="form-field-actions">
        <button type="button" class="form-field-btn" :disabled="!model" :aria-label="`Copy ${field.label}`" :title="`Copy ${field.label}`" @click="copy">
          <div :class="isCopied ? 'i-lucide-check' : 'i-lucide-copy'" />
        </button>
      </div>
    </div>

    <!-- select -->
    <select
      v-else-if="field.type === 'select'"
      class="form-field-input"
      v-model="model"
    >
      <option v-for="opt in field.items" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <!-- checkbox_list -->
    <div v-else-if="field.type === 'checkbox_list'" class="form-field-checks">
      <label v-for="opt in field.items" :key="opt.value" class="form-check-label">
        <input type="checkbox" v-model="model" :value="opt.value" class="form-check-input" />
        {{ opt.label }}
      </label>
    </div>

    <!-- radio_list -->
    <div v-else-if="field.type === 'radio_list'" class="form-field-checks">
      <label v-for="opt in field.items" :key="opt.value" class="form-check-label">
        <input type="radio" v-model="model" :value="opt.value" class="form-check-input" />
        {{ opt.label }}
      </label>
    </div>

    <!-- range -->
    <div v-else-if="field.type === 'range'" class="form-field-range">
      <input
        type="range"
        :min="field.min"
        :max="field.max"
        v-model="model"
        class="form-range-input"
      />
      <span class="form-range-value">{{ model }}</span>
    </div>

    <!-- category path with suggestions -->
    <CategoryInput v-else-if="field.type === 'category'" v-model="model" />

    <!-- all other input types (text, email, password, number, url, tel, date, time, etc.) -->
    <div v-else :class="['form-field-control', { 'form-field-control--secret': isSecret }]">
      <input
        :type="isSecret && !isRevealed ? 'password' : (isSecret ? 'text' : field.type)"
        class="form-field-input"
        :placeholder="field.placeholder"
        v-model="model"
        autocomplete="off"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { copySecret, CLIPBOARD_CLEAR_DELAY } from '@/utils/clipboard'
import { useNotify } from '@/composables/useNotify'
import CategoryInput from './CategoryInput.vue'

const props = defineProps<{
  field: { label: string; type: string; placeholder?: string; items?: { value: string; label: string }[]; min?: number; max?: number }
  modelValue: unknown
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: unknown): void }>()

const model = computed({
  get: () => props.modelValue as any,
  set: (value) => emit('update:modelValue', value),
})

const notify = useNotify()

// Password fields are masked until the user asks to see them
const isSecret = computed(() => props.field.type === 'password')
const isRevealed = ref(false)

const isCopied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  const text = String(model.value ?? '')
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

.form-field-checks {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-check-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  color: var(--c-text);
  cursor: pointer;
}

.form-check-input {
  width: 16px;
  height: 16px;
  accent-color: var(--c-accent);
  cursor: pointer;
}

.form-field-range {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.form-range-input {
  flex: 1;
  accent-color: var(--c-accent);
}

.form-range-value {
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  color: var(--c-text-secondary);
  min-width: 36px;
  text-align: center;
}
</style>