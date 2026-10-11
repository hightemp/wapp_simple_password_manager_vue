<template>
  <div class="pw-gen">
    <button class="pw-gen-toggle" @click="isExpanded = !isExpanded" type="button">
      <div class="i-lucide-key" />
      <span>Generate Password</span>
      <div :class="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
    </button>

    <!-- Scroll the opened panel into view: in a long form it opens below the fold -->
    <Transition name="slide" @after-enter="(el) => (el as HTMLElement).scrollIntoView({ block: 'nearest', behavior: 'smooth' })">
      <div v-if="isExpanded" class="pw-gen-panel">
        <!-- Length slider -->
        <div class="pw-gen-row">
          <label class="pw-gen-label">Length</label>
          <input type="range" :min="8" :max="64" v-model.number="length" class="pw-gen-slider" />
          <span class="pw-gen-length">{{ length }}</span>
        </div>

        <!-- Checkboxes -->
        <div class="pw-gen-options">
          <label class="pw-gen-check"><input type="checkbox" v-model="options.uppercase" /> Uppercase</label>
          <label class="pw-gen-check"><input type="checkbox" v-model="options.lowercase" /> Lowercase</label>
          <label class="pw-gen-check"><input type="checkbox" v-model="options.digits" /> Digits</label>
          <label class="pw-gen-check"><input type="checkbox" v-model="options.symbols" /> Symbols</label>
        </div>

        <!-- Preview -->
        <div v-if="password" class="pw-gen-preview">
          <code class="pw-gen-code">{{ password }}</code>
          <div class="pw-gen-strength" :data-strength="strength" />
        </div>

        <!-- Actions -->
        <div class="pw-gen-actions">
          <button class="gen-btn gen-btn--secondary" @click="generate" type="button">
            <div class="i-lucide-refresh-cw" /> Generate
          </button>
          <button v-if="password" class="gen-btn gen-btn--primary" @click="emit('use', password)" type="button">
            <div class="i-lucide-check" /> Use
          </button>
          <button v-if="password" class="gen-btn gen-btn--ghost" @click="copy" type="button">
            <div class="i-lucide-copy" /> Copy
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { generatePassword } from '@/utils/crypto'
import { copySecret } from '@/utils/clipboard'

const emit = defineEmits<{ (e: 'use', password: string): void }>()

const isExpanded = ref(false)
const password = ref('')
const length = ref(20)
const options = reactive({
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
})

const strength = computed(() => {
  const len = password.value.length
  if (len === 0) return 'none'
  if (len < 12) return 'weak'
  if (len < 20) return 'medium'
  return 'strong'
})

function generate() {
  password.value = generatePassword(length.value, options)
}

function copy() {
  copySecret(password.value).catch(() => { /* clipboard blocked — nothing to do */ })
}

function reset() {
  password.value = ''
  isExpanded.value = false
}

defineExpose({ reset })
</script>

<style scoped>
/* Password Generator */
.pw-gen {
  border-top: 1px solid var(--c-border);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
}

.pw-gen-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2);
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  transition: all var(--transition-fast);
}
.pw-gen-toggle:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}

.pw-gen-panel {
  padding: var(--space-3) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.pw-gen-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.pw-gen-label {
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  min-width: 50px;
}

.pw-gen-slider {
  flex: 1;
  accent-color: var(--c-accent);
  height: 4px;
}

.pw-gen-length {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--c-text);
  min-width: 28px;
  text-align: right;
}

.pw-gen-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.pw-gen-check {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  cursor: pointer;
}
.pw-gen-check input {
  accent-color: var(--c-accent);
}

.pw-gen-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.pw-gen-code {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: var(--c-bg);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  word-break: break-all;
  color: var(--c-text);
  border: 1px solid var(--c-border);
}

.pw-gen-strength {
  height: 4px;
  border-radius: var(--radius-full);
  transition: all var(--transition-normal);
}
.pw-gen-strength[data-strength="weak"] {
  background: var(--c-danger);
  width: 33%;
}
.pw-gen-strength[data-strength="medium"] {
  background: var(--c-warning);
  width: 66%;
}
.pw-gen-strength[data-strength="strong"] {
  background: var(--c-success);
  width: 100%;
}

.pw-gen-actions {
  display: flex;
  gap: var(--space-2);
}

.gen-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.gen-btn--primary {
  background: var(--c-accent);
  color: white;
}
.gen-btn--primary:hover { background: var(--c-accent-hover); }

.gen-btn--secondary {
  background: var(--c-bg);
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
}
.gen-btn--secondary:hover { background: var(--c-bg-hover); }

.gen-btn--ghost {
  background: transparent;
  color: var(--c-text-secondary);
}
.gen-btn--ghost:hover { background: var(--c-bg-hover); }

/* Slide transition */
.slide-enter-active,
.slide-leave-active {
  transition: all 200ms ease;
  overflow: hidden;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0;
}
.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 400px;
}
</style>