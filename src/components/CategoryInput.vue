<template>
  <div class="cat-input-wrap">
    <input
      v-model="query"
      class="form-field-input"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="isOpen"
      aria-controls="category-options"
      placeholder="Uncategorized"
      autocomplete="off"
      @focus="isOpen = true"
      @input="isOpen = true"
      @blur="onBlur"
      @keydown.down.prevent="move(1)"
      @keydown.up.prevent="move(-1)"
      @keydown.enter="onEnter"
      @keydown.esc="onEscape"
    />
    <!-- Rendered in the normal flow (not absolute) so the modal body never clips it -->
    <ul v-if="isOpen && options.length" id="category-options" class="cat-options" role="listbox">
      <li
        v-for="(option, index) in options"
        :key="option.path + option.isNew"
        :class="['cat-option', { 'cat-option--active': index === activeIndex, 'cat-option--new': option.isNew }]"
        role="option"
        :aria-selected="index === activeIndex"
        @mousedown.prevent="choose(option.path)"
      >
        <div :class="option.isNew ? 'i-lucide-folder-plus' : 'i-lucide-folder'" class="cat-option-icon" />
        <span v-if="option.isNew">Create "{{ option.path }}"</span>
        <span v-else>{{ option.path }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import { normalizePath } from '@/utils/categories'

const MAX_OPTIONS = 50

const model = defineModel<string>({ default: '' })
const db = useDatabaseStore()

const query = ref(model.value)
const isOpen = ref(false)
const activeIndex = ref(-1)

// Typing changes the value right away; the list only helps to pick a path
watch(query, (value) => {
  model.value = value
  activeIndex.value = -1
})
watch(model, (value) => {
  if (value !== query.value) query.value = value
})

const options = computed(() => {
  const typed = normalizePath(query.value)
  const needle = typed.toLowerCase()
  const matches = db.categoryPaths
    .filter((path) => !needle || path.toLowerCase().includes(needle))
    .slice(0, MAX_OPTIONS)
    .map((path) => ({ path, isNew: false }))
  const exists = db.categoryPaths.some((path) => path.toLowerCase() === needle)
  if (typed && !exists) matches.push({ path: typed, isNew: true })
  return matches
})

function move(step: number) {
  isOpen.value = true
  const count = options.value.length
  if (!count) return
  activeIndex.value = (activeIndex.value + step + count) % count
}

function choose(path: string) {
  query.value = path
  isOpen.value = false
}

function onEnter(event: KeyboardEvent) {
  if (!isOpen.value || activeIndex.value < 0) return
  event.preventDefault()
  choose(options.value[activeIndex.value].path)
}

function onEscape(event: KeyboardEvent) {
  // Close the list first; a second Escape closes the dialog
  if (!isOpen.value) return
  event.stopPropagation()
  isOpen.value = false
}

function onBlur() {
  isOpen.value = false
  query.value = normalizePath(query.value)
}
</script>

<style scoped>
.cat-input-wrap {
  display: flex;
  flex-direction: column;
}

.cat-options {
  list-style: none;
  margin: var(--space-1) 0 0;
  padding: var(--space-1) 0;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-bg-elevated);
  box-shadow: var(--shadow-lg);
}

.cat-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: 0 var(--space-3);
  font-size: var(--text-base);
  color: var(--c-text);
  cursor: pointer;
}
.cat-option:hover,
.cat-option--active {
  background: var(--c-bg-hover);
}
.cat-option--new {
  color: var(--c-accent);
}

.cat-option-icon {
  flex-shrink: 0;
  color: var(--c-text-muted);
}
.cat-option--new .cat-option-icon {
  color: var(--c-accent);
}
</style>
