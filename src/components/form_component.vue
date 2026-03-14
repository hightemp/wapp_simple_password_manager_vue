<template>
  <div class="form-field">
    <label class="form-field-label">{{ oItem.label }}</label>

    <!-- textarea -->
    <textarea
      v-if="oItem.type === 'textarea'"
      class="form-field-input form-field-textarea"
      rows="4"
      :placeholder="oItem.placeholder"
      v-model="mValue"
    />

    <!-- select -->
    <select
      v-else-if="oItem.type === 'select'"
      class="form-field-input"
      v-model="mValue"
    >
      <option v-for="opt in oItem.items" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <!-- checkbox_list -->
    <div v-else-if="oItem.type === 'checkbox_list'" class="form-field-checks">
      <label v-for="opt in oItem.items" :key="opt.value" class="form-check-label">
        <input type="checkbox" v-model="mValue" :value="opt.value" class="form-check-input" />
        {{ opt.label }}
      </label>
    </div>

    <!-- radio_list -->
    <div v-else-if="oItem.type === 'radio_list'" class="form-field-checks">
      <label v-for="opt in oItem.items" :key="opt.value" class="form-check-label">
        <input type="radio" v-model="mValue" :value="opt.value" class="form-check-input" />
        {{ opt.label }}
      </label>
    </div>

    <!-- range -->
    <div v-else-if="oItem.type === 'range'" class="form-field-range">
      <input
        type="range"
        :min="oItem.min"
        :max="oItem.max"
        v-model="mValue"
        class="form-range-input"
      />
      <span class="form-range-value">{{ mValue }}</span>
    </div>

    <!-- all other input types (text, email, password, number, url, tel, date, time, etc.) -->
    <input
      v-else
      :type="oItem.type"
      class="form-field-input"
      :placeholder="oItem.placeholder"
      v-model="mValue"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps(['item', 'value'])
const emit = defineEmits(['input'])

const oItem = computed(() => props.item)
const mValue = computed({
  get: () => props.value,
  set: (mV) => emit('input', mV),
})
</script>

<style scoped>
.form-field {
  margin-bottom: var(--space-4);
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
.form-field-input::placeholder {
  color: var(--c-text-muted);
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