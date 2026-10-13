<template>
  <BaseModal :model-value="qr !== null" :title="qr?.title ?? ''" size="sm" @update:model-value="(open) => !open && emit('close')">
    <div class="qr">
      <svg v-if="matrix" class="qr-image" :viewBox="`0 0 ${matrix.size + 8} ${matrix.size + 8}`" role="img" :aria-label="qr?.title">
        <rect width="100%" height="100%" fill="#fff" />
        <path :d="matrix.path" fill="#000" transform="translate(4 4)" />
      </svg>
      <p v-else-if="error" class="qr-error">{{ error }}</p>
      <p v-if="qr?.hint" class="qr-hint">{{ qr.hint }}</p>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'

const props = defineProps<{
  // Modal is shown while set
  qr: { title: string; text: string; hint?: string } | null
}>()
const emit = defineEmits<{ (e: 'close'): void }>()

const matrix = ref<{ size: number; path: string } | null>(null)
const error = ref('')

watch(() => props.qr, async (qr) => {
  matrix.value = null
  error.value = ''
  if (!qr) return
  try {
    // Loaded only when a QR code is shown
    const { default: qrcode } = await import('qrcode-generator')
    // The default encoding drops non-Latin characters
    qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s))
    const code = qrcode(0, 'M')
    code.addData(qr.text, 'Byte')
    code.make()
    const size = code.getModuleCount()
    let path = ''
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (code.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`
      }
    }
    matrix.value = { size, path }
  } catch (cause) {
    error.value = 'The QR code could not be created: ' + (cause instanceof Error ? cause.message : String(cause))
  }
}, { immediate: true })
</script>

<style scoped>
.qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.qr-image {
  width: min(280px, 100%);
  height: auto;
  border-radius: var(--radius-md);
  shape-rendering: crispEdges;
}

.qr-hint,
.qr-error {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.5;
}

.qr-error {
  color: var(--c-danger);
}
</style>
