<template>
<BaseModal v-model="isOpen" :title="title" size="md">
  <EntryFormFields />

  <PasswordGenerator ref="generator" @use="(password) => db.setFormField('password', password)" />

  <template #footer>
    <button class="action-btn action-btn--ghost" @click="close">Cancel</button>
    <button class="action-btn action-btn--primary" @click="save">Save</button>
  </template>
</BaseModal>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import BaseModal from './BaseModal.vue'
import EntryFormFields from './EntryFormFields.vue'
import PasswordGenerator from './PasswordGenerator.vue'

defineProps<{ title: string }>()

const db = useDatabaseStore()
const generator = useTemplateRef('generator')

const isOpen = computed({
  get: () => db.editWindow.isOpen,
  set: (value) => { if (!value) close() },
})

function close() {
  generator.value?.reset()
  db.closeEditWindow()
}

function save() {
  db.saveEditWindow()
  close()
}
</script>
