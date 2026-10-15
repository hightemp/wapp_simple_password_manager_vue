<template>
  <BaseModal :model-value="open" :title="title" size="sm" @update:model-value="(value) => !value && emit('close')">
    <form class="name-form" @submit.prevent="save">
      <label class="name-label" :for="inputId">{{ hint }}</label>
      <input
        :id="inputId"
        ref="input"
        v-model="name"
        class="form-field-input name-input"
        placeholder="Category name"
        autocomplete="off"
        enterkeyhint="done"
      />
    </form>
    <template #footer>
      <div class="modal-footer-row">
        <button class="action-btn action-btn--ghost" @click="emit('close')">Cancel</button>
        <button class="action-btn action-btn--primary" :disabled="!name.trim()" @click="save">Save</button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, useId, useTemplateRef } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps<{
  open: boolean
  title: string
  // Where the category is: "In Finance", "Top level"
  hint: string
  initial?: string
}>()

const emit = defineEmits<{
  (e: 'save', name: string): void
  (e: 'close'): void
}>()

const inputId = useId()
const input = useTemplateRef<HTMLInputElement>('input')
const name = ref('')

watch(() => props.open, async (open) => {
  if (!open) return
  name.value = props.initial ?? ''
  // After the modal has focused its first button
  await nextTick()
  await nextTick()
  input.value?.focus()
  input.value?.select()
})

function save() {
  const value = name.value.trim()
  if (value) emit('save', value)
}
</script>

<style scoped>
.name-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.name-label {
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
}

.name-input {
  width: 100%;
}
</style>
