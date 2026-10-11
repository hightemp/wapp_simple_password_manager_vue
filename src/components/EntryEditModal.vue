<template>
<BaseModal v-model="isOpen" :title="title" size="md">
  <EntryFormFields :form-name="formName" />

  <PasswordGenerator ref="generator" @use="(password) => db.setFormField(formName, 'password', password)" />

  <template #footer>
    <button class="footer-btn footer-btn--ghost" @click="close">Cancel</button>
    <button class="footer-btn footer-btn--primary" @click="save">Save</button>
  </template>
</BaseModal>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import BaseModal from './BaseModal.vue'
import EntryFormFields from './EntryFormFields.vue'
import PasswordGenerator from './PasswordGenerator.vue'

const props = defineProps<{
  title: string
  formName: string
  tableName: string
}>()

const db = useDatabaseStore()
const generator = useTemplateRef('generator')

const isOpen = computed({
  get: () => db.editWindows[props.formName]?.isOpen ?? false,
  set: (value) => { if (!value) close() },
})

function close() {
  generator.value?.reset()
  db.closeEditWindow(props.formName)
}

function save() {
  db.saveEditWindow(props.tableName, props.formName)
  close()
}
</script>

<style scoped>
/* Footer buttons */
.footer-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-5);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-base);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.footer-btn--primary {
  background: var(--c-accent);
  color: white;
}
.footer-btn--primary:hover { background: var(--c-accent-hover); }

.footer-btn--ghost {
  background: transparent;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
}
.footer-btn--ghost:hover { background: var(--c-bg-hover); }
</style>
