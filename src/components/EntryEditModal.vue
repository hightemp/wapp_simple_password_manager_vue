<template>
<BaseModal v-model="isOpen" :title="title" size="md">
  <EntryFormFields />

  <PasswordGenerator ref="generator" @use="(password) => db.setFormField('password', password)" />

  <template #footer>
    <div class="modal-footer-row">
      <button
        v-if="db.editWindow.item.id"
        class="action-btn action-btn--ghost edit-history-btn"
        @click="showHistory = true"
      >
        <div class="i-lucide-history" /> History
        <span v-if="historyCount" class="edit-history-count">{{ historyCount }}</span>
      </button>
      <button class="action-btn action-btn--ghost" @click="close">Cancel</button>
      <button class="action-btn action-btn--primary" @click="save">Save</button>
    </div>
  </template>
</BaseModal>

<!-- Restoring fills the form; the change is stored (and recorded) on Save -->
<EntryHistoryModal
  :entry="showHistory && isOpen ? db.editWindow.item : null"
  :current="db.form"
  @restore="restore"
  @clear="db.clearHistory(db.editWindow.item.id!)"
  @close="showHistory = false"
/>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { useNotify } from '@/composables/useNotify'
import BaseModal from './BaseModal.vue'
import EntryFormFields from './EntryFormFields.vue'
import EntryHistoryModal from './EntryHistoryModal.vue'
import PasswordGenerator from './PasswordGenerator.vue'

defineProps<{ title: string }>()

const db = useDatabaseStore()
const notify = useNotify()
const generator = useTemplateRef('generator')
const showHistory = ref(false)

const historyCount = computed(() => db.editWindow.item.history?.length ?? 0)

const isOpen = computed({
  get: () => db.editWindow.isOpen,
  set: (value) => { if (!value) close() },
})

function close() {
  generator.value?.reset()
  showHistory.value = false
  db.closeEditWindow()
}

function save() {
  db.saveEditWindow()
  close()
}

function restore(fields: Record<string, string>) {
  for (const [field, value] of Object.entries(fields)) db.setFormField(field, value)
  showHistory.value = false
  notify('Restored in the form', 'Press Save to keep the restored values', 'info')
}
</script>

<style scoped>
.edit-history-btn {
  margin-right: auto;
}

.edit-history-count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: var(--radius-full);
  background: var(--c-bg-hover);
  color: var(--c-text-muted);
  font-size: var(--text-xs);
  text-align: center;
}
</style>
