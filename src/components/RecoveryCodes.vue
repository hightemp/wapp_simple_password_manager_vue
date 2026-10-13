<template>
  <ul class="codes" aria-label="Recovery codes">
    <li v-for="code in codes" :key="code.line" :class="['code', { 'code--used': code.used }]">
      <button
        type="button"
        class="code-toggle"
        :aria-pressed="code.used"
        :title="code.used ? 'Used — click to mark as unused' : 'Click to mark as used'"
        @click="emit('update:value', toggleUsed(value, code.line))"
      >
        <div :class="code.used ? 'i-lucide-square-check' : 'i-lucide-square'" />
        <span class="code-text">{{ code.code }}</span>
      </button>
      <button type="button" class="code-copy" :aria-label="`Copy code ${code.code}`" @click="copy(code.code)">
        <div class="i-lucide-copy" />
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { parseCodes, toggleUsed } from '@/utils/recoveryCodes'
import { copySecret, CLIPBOARD_CLEAR_DELAY } from '@/utils/clipboard'
import { useNotify } from '@/composables/useNotify'

const props = defineProps<{ value: string }>()
const emit = defineEmits<{ (e: 'update:value', value: string): void }>()
const notify = useNotify()

const codes = computed(() => parseCodes(props.value))

async function copy(code: string) {
  try {
    await copySecret(code)
  } catch (_) {
    notify('Copy failed', 'The browser blocked clipboard access', 'error')
    return
  }
  notify('Copied', `Clipboard will be cleared in ${CLIPBOARD_CLEAR_DELAY / 1000} s`, 'success', 2000)
}
</script>

<style scoped>
.codes {
  list-style: none;
  margin: var(--space-2) 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: var(--space-1);
}

.code {
  display: flex;
  align-items: center;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
}

.code-toggle {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: 0 var(--space-2);
  border: none;
  background: transparent;
  color: var(--c-text);
  cursor: pointer;
  text-align: left;
}

.code-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code--used .code-text {
  text-decoration: line-through;
  color: var(--c-text-muted);
}
.code--used .code-toggle > div {
  color: var(--c-success);
}

.code-copy {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.code-copy:hover,
.code-toggle:hover {
  background: var(--c-bg-hover);
}

@media (max-width: 768px) {
  .code-toggle,
  .code-copy {
    min-height: 44px;
  }
  .code-copy {
    width: 44px;
  }
}
</style>
