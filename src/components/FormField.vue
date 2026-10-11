<template>
  <div class="form-field">
    <label class="form-field-label">{{ field.label }}</label>

    <!-- textarea -->
    <textarea
      v-if="field.type === 'textarea'"
      class="form-field-input form-field-textarea"
      rows="4"
      :placeholder="field.placeholder"
      v-model="model"
      autocomplete="off"
    />

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

    <!-- all other input types (text, email, password, number, url, tel, date, time, etc.) -->
    <input
      v-else
      :type="field.type"
      class="form-field-input"
      :placeholder="field.placeholder"
      v-model="model"
      autocomplete="off"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  field: { label: string; type: string; placeholder?: string; items?: { value: string; label: string }[]; min?: number; max?: number }
  modelValue: unknown
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: unknown): void }>()

const model = computed({
  get: () => props.modelValue as any,
  set: (value) => emit('update:modelValue', value),
})
</script>

<style scoped>
.form-field {
  margin-bottom: var(--space-4);
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