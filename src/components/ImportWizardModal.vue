<template>
  <BaseModal v-model="isOpen" title="Import from another app" size="lg">
    <!-- Step 1: the file -->
    <div
      v-if="!result"
      :class="['import-drop', { 'import-drop--over': isDragOver }]"
      @dragover.prevent="isDragOver = true"
      @dragleave="isDragOver = false"
      @drop.prevent="onDrop"
    >
      <div class="i-lucide-file-input import-drop-icon" />
      <p class="import-drop-title">Choose or drop an export file</p>
      <p class="import-drop-sub">CSV, JSON, XML or 1PUX from a browser, Bitwarden, KeePass, 1Password or LastPass. The file is read only in this browser.</p>
      <button class="action-btn action-btn--primary" @click="fileInput?.click()">
        <div class="i-lucide-folder-open" /> Choose file
      </button>
      <input ref="fileInput" type="file" class="sr-only" accept=".csv,.json,.xml,.1pux,text/csv,application/json" aria-label="Export file" @change="onFileChosen" />

      <details class="import-help">
        <summary>How to export from another app</summary>
        <dl>
          <template v-for="item in IMPORT_FORMATS" :key="item.id">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.hint }}</dd>
          </template>
        </dl>
      </details>
    </div>

    <!-- Step 2: preview and options -->
    <div v-else class="import-preview">
      <div class="import-row">
        <div class="form-field">
          <label class="form-field-label" :for="formatId">Format</label>
          <select :id="formatId" v-model="format" class="form-field-input" @change="parse">
            <option v-for="item in IMPORT_FORMATS" :key="item.id" :value="item.id">{{ item.label }}</option>
          </select>
        </div>
        <div class="form-field">
          <label class="form-field-label" :for="prefixId">Put into category</label>
          <input :id="prefixId" v-model="prefix" class="form-field-input" placeholder="(top level)" autocomplete="off" />
        </div>
      </div>

      <!-- Generic CSV: which column holds what -->
      <div v-if="format === 'generic-csv'" class="import-mapping">
        <div v-for="target in MAPPING_TARGETS" :key="target.key" class="form-field">
          <label class="form-field-label">{{ target.label }}</label>
          <select v-model.number="mapping[target.key]" class="form-field-input" :aria-label="`${target.label} column`" @change="parse">
            <option :value="-1">—</option>
            <option v-for="(header, index) in headers" :key="index" :value="index">{{ header }}</option>
          </select>
        </div>
      </div>

      <div class="import-summary">
        <span v-for="item in typeCounts" :key="item.type.id" class="import-chip">
          <div :class="item.type.icon" /> {{ item.count }} {{ item.type.label }}
        </span>
        <span v-if="!result.entries.length" class="import-chip import-chip--muted">No entries found</span>
      </div>

      <label v-if="duplicates.size" class="import-duplicates">
        <input v-model="includeDuplicates" type="checkbox" />
        {{ duplicates.size }} {{ duplicates.size === 1 ? 'entry is' : 'entries are' }} already in the database and will be skipped — import them anyway
      </label>

      <ul v-if="result.warnings.length" class="import-warnings">
        <li v-for="warning in result.warnings" :key="warning"><div class="i-lucide-triangle-alert" /> {{ warning }}</li>
      </ul>

      <ul class="import-list" aria-label="Entries to import">
        <li v-for="(item, index) in preview" :key="index" :class="['import-item', { 'import-item--duplicate': duplicates.has(item) && !includeDuplicates }]">
          <div :class="[typeOf(item).icon, 'import-item-icon']" />
          <span class="import-item-name">{{ item.name }}</span>
          <span class="import-item-details">{{ typeOf(item).details(item.fields) }}</span>
          <span class="import-item-category">{{ categoryOf(item) || 'Uncategorized' }}</span>
        </li>
        <li v-if="result.entries.length > preview.length" class="import-more">
          … and {{ result.entries.length - preview.length }} more
        </li>
      </ul>
    </div>

    <Transition name="error-slide">
      <div v-if="error" class="import-error">
        <div class="i-lucide-alert-circle" />
        <span>{{ error }}</span>
      </div>
    </Transition>

    <template #footer>
      <div class="modal-footer-row">
        <button v-if="result" class="action-btn action-btn--ghost import-back" @click="reset">
          <div class="i-lucide-arrow-left" /> Other file
        </button>
        <button class="action-btn action-btn--ghost import-cancel" @click="isOpen = false">Cancel</button>
        <button v-if="result" class="action-btn action-btn--primary import-run" :disabled="!toImport.length" @click="runImport">
          <div class="i-lucide-download" /> Import {{ toImport.length }} {{ toImport.length === 1 ? 'entry' : 'entries' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import {
  IMPORT_FORMATS, readImportFile, detectFormat, parseImport, csvHeaders, guessCsvMapping,
  type ImportFile, type ImportFormat, type ImportResult, type ImportedEntry, type CsvMapping,
} from '@/services/importers'
import { ENTRY_TYPES, entryType } from '@/types/entryTypes'
import { joinPath, normalizePath } from '@/utils/categories'
import BaseModal from './BaseModal.vue'

const isOpen = defineModel<boolean>({ required: true })
const emit = defineEmits<{ (e: 'imported', ids: number[], source: string, fileName: string): void }>()

const MAPPING_TARGETS: { key: keyof CsvMapping; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'login', label: 'Login' },
  { key: 'password', label: 'Password' },
  { key: 'url', label: 'URL' },
  { key: 'notes', label: 'Notes' },
  { key: 'category', label: 'Category' },
]
const PREVIEW_SIZE = 50

const db = useDatabaseStore()
const formatId = useId()
const prefixId = useId()
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

const file = ref<ImportFile | null>(null)
const format = ref<ImportFormat>('chrome-csv')
const result = ref<ImportResult | null>(null)
const headers = ref<string[]>([])
const mapping = ref<CsvMapping>(guessCsvMapping([]))
const prefix = ref('')
const includeDuplicates = ref(false)
const isDragOver = ref(false)
const error = ref('')

function reset() {
  file.value = null
  result.value = null
  headers.value = []
  error.value = ''
  includeDuplicates.value = false
}

// Start over every time the wizard opens
watch(isOpen, (open) => { if (open) reset() })

async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const chosen = input.files?.[0]
  input.value = ''
  if (chosen) await load(chosen)
}

async function onDrop(event: DragEvent) {
  isDragOver.value = false
  const dropped = event.dataTransfer?.files?.[0]
  if (dropped) await load(dropped)
}

async function load(chosen: File) {
  error.value = ''
  try {
    file.value = await readImportFile(chosen)
    format.value = detectFormat(file.value)
  } catch (cause) {
    file.value = null
    error.value = cause instanceof Error ? cause.message : String(cause)
    return
  }
  if (format.value === 'generic-csv') {
    headers.value = csvHeaders(file.value)
    mapping.value = guessCsvMapping(headers.value)
  }
  await parse()
}

async function parse() {
  if (!file.value) return
  error.value = ''
  if (format.value === 'generic-csv' && !headers.value.length) {
    headers.value = csvHeaders(file.value)
    mapping.value = guessCsvMapping(headers.value)
  }
  try {
    const parsed = await parseImport(format.value, file.value, mapping.value)
    // Keep a prefix the user typed; otherwise follow the detected source
    if (!result.value || prefix.value === `Imported/${result.value.source}`) prefix.value = `Imported/${parsed.source}`
    result.value = parsed
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
    if (!result.value) file.value = null
  }
}

const duplicates = computed(() => (result.value ? db.findDuplicates(result.value.entries) : new Set<ImportedEntry>()))
const toImport = computed(() =>
  (result.value?.entries ?? []).filter((item) => includeDuplicates.value || !duplicates.value.has(item))
)
const preview = computed(() => (result.value?.entries ?? []).slice(0, PREVIEW_SIZE))

const typeCounts = computed(() => ENTRY_TYPES
  .map((type) => ({ type, count: toImport.value.filter((item) => item.type === type.id).length }))
  .filter((item) => item.count))

function typeOf(item: ImportedEntry) {
  return entryType({ type: item.type })
}

function categoryOf(item: ImportedEntry): string {
  return normalizePath(joinPath(normalizePath(prefix.value), normalizePath(item.category)))
}

function runImport() {
  if (!result.value || !file.value) return
  const ids = db.addImportedEntries(toImport.value, prefix.value)
  emit('imported', ids, result.value.source, file.value.name)
  isOpen.value = false
}
</script>

<style scoped>
.import-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-6) var(--space-4);
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-lg);
  text-align: center;
}
.import-drop--over {
  border-color: var(--c-accent);
  background: color-mix(in srgb, var(--c-accent) 6%, transparent);
}

.import-drop-icon {
  font-size: 36px;
  color: var(--c-accent);
}

.import-drop-title {
  margin: 0;
  font-weight: 600;
  color: var(--c-text);
}

.import-drop-sub {
  margin: 0 0 var(--space-2);
  max-width: 440px;
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}

.import-help {
  width: 100%;
  margin-top: var(--space-3);
  text-align: left;
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
}
.import-help summary {
  cursor: pointer;
  color: var(--c-accent);
  font-weight: 600;
}
.import-help dl {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--space-1) var(--space-3);
  margin: var(--space-2) 0 0;
}
.import-help dt {
  font-weight: 600;
  color: var(--c-text);
}
.import-help dd {
  margin: 0;
}

.import-preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.import-preview .form-field {
  margin-bottom: 0;
}

.import-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.import-mapping {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2) var(--space-3);
  padding: var(--space-3);
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-md);
}

.import-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.import-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--c-accent) 10%, transparent);
  color: var(--c-text);
  font-size: var(--text-sm);
  font-weight: 500;
}
.import-chip--muted {
  background: var(--c-bg-hover);
  color: var(--c-text-muted);
}

.import-duplicates {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
  cursor: pointer;
}

.import-warnings {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: var(--text-sm);
  color: var(--c-text-secondary);
}
.import-warnings li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}
.import-warnings div {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--c-warning);
}

.import-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
}

.import-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--space-2);
  min-height: 34px;
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--c-border);
  font-size: var(--text-sm);
}
.import-item:last-child {
  border-bottom: none;
}
.import-item--duplicate {
  opacity: 0.45;
  text-decoration: line-through;
}

.import-item-icon {
  color: var(--c-text-muted);
}

.import-item-name,
.import-item-details,
.import-item-category {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.import-item-name {
  font-weight: 500;
  color: var(--c-text);
}
.import-item-details,
.import-item-category {
  color: var(--c-text-secondary);
}

.import-more {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}

.import-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: color-mix(in srgb, var(--c-danger) 12%, transparent);
  border-radius: var(--radius-md);
  color: var(--c-danger);
  font-size: var(--text-sm);
}

.import-back {
  margin-right: auto;
}

.import-back,
.import-run {
  white-space: nowrap;
}

@media (max-width: 768px) {
  .import-row {
    grid-template-columns: 1fr;
  }
  .import-mapping {
    grid-template-columns: 1fr 1fr;
  }
  /* The sheet closes with ✕; keep the footer on one line */
  .import-cancel {
    display: none;
  }
  .import-item {
    grid-template-columns: 20px minmax(0, 1fr) minmax(0, 1fr);
  }
  .import-item-details {
    display: none;
  }
  .import-help dl {
    grid-template-columns: 1fr;
  }
}
</style>
