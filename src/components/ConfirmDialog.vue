<template>
  <BaseModal v-model="isOpen" :title="options.title" size="sm" @update:model-value="(open) => !open && finish(false)">
    <p class="confirm-message">{{ options.message }}</p>

    <template #footer>
      <div class="modal-footer-row">
        <button class="action-btn action-btn--ghost" @click="finish(false)">
          {{ options.cancelText ?? 'Cancel' }}
        </button>
        <button
          :class="['action-btn', options.danger ? 'action-btn--danger-solid' : 'action-btn--primary']"
          @click="finish(true)"
        >
          {{ options.confirmText ?? 'OK' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ConfirmOptions } from '@/composables/useConfirm'
import BaseModal from './BaseModal.vue'

const isOpen = ref(false)
const options = ref<ConfirmOptions>({ title: '', message: '' })
let resolvePending: ((confirmed: boolean) => void) | null = null

/** Show the dialog; resolves to true when confirmed, false when cancelled or closed */
function ask(newOptions: ConfirmOptions): Promise<boolean> {
  resolvePending?.(false)
  options.value = newOptions
  // BaseModal focuses the first button — Cancel — so Enter never confirms by accident
  isOpen.value = true
  return new Promise((resolve) => { resolvePending = resolve })
}

function finish(confirmed: boolean) {
  isOpen.value = false
  resolvePending?.(confirmed)
  resolvePending = null
}

defineExpose({ ask })
</script>

<style scoped>
.confirm-message {
  font-size: var(--text-base);
  color: var(--c-text-secondary);
  line-height: 1.5;
  white-space: pre-line;
}
</style>
