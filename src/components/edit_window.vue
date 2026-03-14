<template>
<BaseModal v-model="bShow" :title="title" size="md" @update:modelValue="onModalChange">
  <FormFields :form_name="form_name" />

  <!-- Password Generator Panel -->
  <div class="pw-gen">
    <button class="pw-gen-toggle" @click="bShowGen = !bShowGen" type="button">
      <div class="i-lucide-key" />
      <span>Generate Password</span>
      <div :class="bShowGen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" />
    </button>

    <Transition name="slide">
      <div v-if="bShowGen" class="pw-gen-panel">
        <!-- Length slider -->
        <div class="pw-gen-row">
          <label class="pw-gen-label">Length</label>
          <input type="range" :min="8" :max="64" v-model.number="iPwLength" class="pw-gen-slider" />
          <span class="pw-gen-length">{{ iPwLength }}</span>
        </div>

        <!-- Checkboxes -->
        <div class="pw-gen-options">
          <label class="pw-gen-check"><input type="checkbox" v-model="bUppercase" /> Uppercase</label>
          <label class="pw-gen-check"><input type="checkbox" v-model="bLowercase" /> Lowercase</label>
          <label class="pw-gen-check"><input type="checkbox" v-model="bDigits" /> Digits</label>
          <label class="pw-gen-check"><input type="checkbox" v-model="bSymbols" /> Symbols</label>
        </div>

        <!-- Preview -->
        <div v-if="sGeneratedPassword" class="pw-gen-preview">
          <code class="pw-gen-code">{{ sGeneratedPassword }}</code>
          <div class="pw-gen-strength" :data-strength="passwordStrength" />
        </div>

        <!-- Actions -->
        <div class="pw-gen-actions">
          <button class="gen-btn gen-btn--secondary" @click="fnGenerate" type="button">
            <div class="i-lucide-refresh-cw" /> Generate
          </button>
          <button v-if="sGeneratedPassword" class="gen-btn gen-btn--primary" @click="fnUseGenerated" type="button">
            <div class="i-lucide-check" /> Use
          </button>
          <button v-if="sGeneratedPassword" class="gen-btn gen-btn--ghost" @click="fnCopyGenerated" type="button">
            <div class="i-lucide-copy" /> Copy
          </button>
        </div>
      </div>
    </Transition>
  </div>

  <template #footer>
    <button class="footer-btn footer-btn--ghost" @click="fnClose">Cancel</button>
    <button class="footer-btn footer-btn--primary" @click="fnSave">Save</button>
  </template>
</BaseModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '../stores/database'
import { fnGeneratePassword } from '../crypto'
import BaseModal from './BaseModal.vue'
import FormFields from './forms.vue'

const props = defineProps<{
  title: string
  form_name: string
  table_name: string
}>()

const db = useDatabaseStore()

const sGeneratedPassword = ref('')
const bShowGen = ref(false)
const iPwLength = ref(20)
const bUppercase = ref(true)
const bLowercase = ref(true)
const bDigits = ref(true)
const bSymbols = ref(true)

const bShow = computed({
  get: () => db.oEditWindow[props.form_name]?.window_show ?? false,
  set: () => { /* handled by onModalChange */ },
})

const passwordStrength = computed(() => {
  const len = sGeneratedPassword.value.length
  if (len === 0) return 'none'
  if (len < 12) return 'weak'
  if (len < 20) return 'medium'
  return 'strong'
})

function onModalChange(v: boolean) {
  if (!v) fnClose()
}

function fnClose() {
  sGeneratedPassword.value = ''
  bShowGen.value = false
  db.fnHideEditWindow(props.form_name)
}

function fnSave() {
  sGeneratedPassword.value = ''
  bShowGen.value = false
  db.fnEditWindowSave({ sTableName: props.table_name, sFormName: props.form_name })
  db.fnHideEditWindow(props.form_name)
}

function fnGenerate() {
  let charset = ''
  if (bUppercase.value) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (bLowercase.value) charset += 'abcdefghijklmnopqrstuvwxyz'
  if (bDigits.value) charset += '0123456789'
  if (bSymbols.value) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'
  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  const arr = new Uint32Array(iPwLength.value)
  crypto.getRandomValues(arr)
  sGeneratedPassword.value = Array.from(arr, (v) => charset[v % charset.length]).join('')
}

function fnUseGenerated() {
  db.fnUpdateFormVar({ sFormName: props.form_name, sFieldName: 'password', mV: sGeneratedPassword.value })
}

function fnCopyGenerated() {
  navigator.clipboard.writeText(sGeneratedPassword.value)
}
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