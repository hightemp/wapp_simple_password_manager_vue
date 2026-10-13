<template>
  <div class="entry-type-row">
    <label class="form-field-label" :for="typeId">Type</label>
    <div class="entry-type-control">
      <div :class="[currentType.icon, 'entry-type-icon']" />
      <select :id="typeId" class="entry-type-select" :value="db.formType" aria-label="Entry type" @change="changeType">
        <option v-for="type in ENTRY_TYPES" :key="type.id" :value="type.id">{{ type.label }}</option>
      </select>
    </div>
  </div>

  <FormField field-key="category" :field="{ label: 'Category', kind: 'category' }" v-model="db.form.category" />
  <FormField field-key="name" :field="{ label: 'Name', kind: 'text' }" v-model="db.form.name" />
  <FormField
    v-for="field in currentType.fields"
    :key="field.key"
    :field-key="field.key"
    :field="field"
    v-model="db.form[field.key]"
  />

  <!-- Fields added by the user -->
  <div v-for="(custom, index) in db.formCustom" :key="custom.id" class="custom-field" :data-custom="custom.id">
    <div class="custom-field-header">
      <input
        class="custom-field-label"
        :value="custom.label"
        placeholder="Field name"
        aria-label="Field name"
        autocomplete="off"
        @input="(event) => db.updateCustomField(custom.id, { label: (event.target as HTMLInputElement).value })"
      />
      <select
        class="custom-field-kind"
        :value="custom.kind"
        aria-label="Field kind"
        @change="(event) => db.updateCustomField(custom.id, { kind: (event.target as HTMLSelectElement).value as CustomFieldKind })"
      >
        <option v-for="item in CUSTOM_FIELD_KINDS" :key="item.kind" :value="item.kind">{{ item.label }}</option>
      </select>
      <button type="button" class="custom-field-btn" :disabled="index === 0" aria-label="Move field up" @click="db.moveCustomField(custom.id, -1)">
        <div class="i-lucide-chevron-up" />
      </button>
      <button type="button" class="custom-field-btn" :disabled="index === db.formCustom.length - 1" aria-label="Move field down" @click="db.moveCustomField(custom.id, 1)">
        <div class="i-lucide-chevron-down" />
      </button>
      <button type="button" class="custom-field-btn custom-field-btn--danger" aria-label="Remove field" @click="db.removeCustomField(custom.id)">
        <div class="i-lucide-x" />
      </button>
    </div>
    <FormField
      :key="custom.kind"
      :field-key="customKey(custom.id)"
      :field="{ label: custom.label || 'Field', kind: custom.kind }"
      v-model="db.form[customKey(custom.id)]"
      hide-label
    />
  </div>

  <button type="button" class="add-field-btn" @click="addField">
    <div class="i-lucide-plus" /> Add field
  </button>
</template>

<script setup lang="ts">
import { computed, nextTick, useId } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { ENTRY_TYPES, CUSTOM_FIELD_KINDS, customKey, entryType, type CustomFieldKind } from '@/types/entryTypes'
import FormField from './FormField.vue'

const db = useDatabaseStore()
const typeId = useId()

const currentType = computed(() => entryType({ type: db.formType }))

function changeType(event: Event) {
  db.setFormType((event.target as HTMLSelectElement).value)
}

async function addField() {
  const id = db.addCustomField()
  await nextTick()
  document.querySelector<HTMLInputElement>(`[data-custom="${id}"] .custom-field-label`)?.focus()
}
</script>

<style scoped>
.entry-type-row {
  margin-bottom: var(--space-4);
}

.entry-type-control {
  position: relative;
  display: flex;
  align-items: center;
}

.entry-type-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--c-accent);
  pointer-events: none;
}

.entry-type-select {
  width: 100%;
  height: 40px;
  padding: 0 var(--space-3) 0 calc(var(--space-3) + 24px);
  border: 1.5px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
}
.entry-type-select:focus {
  outline: none;
  border-color: var(--c-accent);
}

.custom-field {
  margin-bottom: var(--space-4);
  padding: var(--space-2) var(--space-2) 0;
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-md);
}
.custom-field :deep(.form-field) {
  margin-bottom: var(--space-2);
}

.custom-field-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.custom-field-label,
.custom-field-kind {
  height: 32px;
  padding: 0 var(--space-2);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: var(--text-sm);
}
.custom-field-label {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}
.custom-field-kind {
  flex-shrink: 0;
  max-width: 45%;
}
.custom-field-label:focus,
.custom-field-kind:focus {
  outline: none;
  border-color: var(--c-accent);
}

.custom-field-btn {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.custom-field-btn:hover:not(:disabled) {
  background: var(--c-bg-hover);
  color: var(--c-text);
}
.custom-field-btn--danger:hover:not(:disabled) {
  color: var(--c-danger);
}
.custom-field-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.add-field-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  padding: var(--space-1) var(--space-2);
  border: none;
  background: transparent;
  color: var(--c-accent);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.add-field-btn:hover {
  background: var(--c-bg-hover);
}

@media (max-width: 768px) {
  .entry-type-select,
  .custom-field-label,
  .custom-field-kind {
    font-size: 16px;
  }
  .custom-field-btn {
    width: 36px;
    height: 36px;
  }
}
</style>
