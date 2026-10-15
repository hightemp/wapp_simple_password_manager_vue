<template>
  <div class="mobile-search">
    <div class="i-lucide-search mobile-search-icon" />
    <input
      v-model="searchQuery"
      type="search"
      class="mobile-search-input"
      placeholder="Search"
      aria-label="Search entries"
      autocomplete="off"
    />
    <button class="mobile-category-btn" aria-label="Choose category" @click="emit('pick-category')">
      <div class="i-lucide-folder" />
      <span class="mobile-category-name">{{ categoryLabel }}</span>
    </button>
    <button :class="['mobile-sort-btn', { 'mobile-sort-btn--active': sort }]" aria-label="Sort" @click="showSort = true">
      <div class="i-lucide-arrow-up-down" />
    </button>
  </div>

  <BaseModal v-model="showSort" title="Sort" size="sm">
    <div class="sort-list" role="radiogroup" aria-label="Sort entries">
      <button
        v-for="option in SORT_OPTIONS"
        :key="option.label"
        :class="['sort-option', { 'sort-option--selected': isCurrent(option.value) }]"
        role="radio"
        :aria-checked="isCurrent(option.value)"
        @click="choose(option.value)"
      >
        <div :class="option.icon" class="sort-option-icon" />
        <span class="sort-option-label">{{ option.label }}</span>
        <div v-if="isCurrent(option.value)" class="i-lucide-check sort-option-check" />
      </button>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useEntryList, ADDED_SORT, type EntrySort } from '@/composables/useEntryList'
import { useCategoryState } from '@/composables/useCategoryState'
import { pathName } from '@/utils/categories'
import { entryType, EXPIRING_FILTER } from '@/types/entryTypes'
import BaseModal from './BaseModal.vue'

const emit = defineEmits<{
  (e: 'pick-category'): void
}>()

const { searchQuery, isTrashView, activeCategories, sort, setSort } = useEntryList()
const { typeFilter } = useCategoryState()

// --- sorting (shared with the table) ---
const SORT_OPTIONS: { label: string; icon: string; value: EntrySort | null }[] = [
  { label: 'Default order', icon: 'i-lucide-list', value: null },
  { label: 'Name A → Z', icon: 'i-lucide-arrow-down-a-z', value: { key: 'name', ascending: true } },
  { label: 'Name Z → A', icon: 'i-lucide-arrow-up-z-a', value: { key: 'name', ascending: false } },
  { label: 'Recently added', icon: 'i-lucide-clock', value: { key: ADDED_SORT, ascending: false } },
]
const showSort = ref(false)

function isCurrent(value: EntrySort | null): boolean {
  return value === null ? sort.value === null : sort.value?.key === value.key && sort.value.ascending === value.ascending
}

function choose(value: EntrySort | null) {
  setSort(value)
  showSort.value = false
}

// Where the list is: category (or trash) and the type filter
const categoryLabel = computed(() => {
  const type = typeFilter.value === EXPIRING_FILTER ? 'Expiring' : typeFilter.value && entryType({ type: typeFilter.value }).label
  return type ? `${placeLabel.value} · ${type}` : placeLabel.value
})
const placeLabel = computed(() => {
  if (isTrashView.value) return 'Trash'
  const categories = activeCategories.value
  if (categories.length > 1) return `${categories.length} categories`
  const category = categories[0]
  if (category === null) return 'All'
  return category === '' ? 'Uncategorized' : pathName(category)
})
</script>

<style scoped>
.mobile-search {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--c-bg-elevated);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}

.mobile-search-icon {
  position: absolute;
  left: calc(var(--space-3) + 12px);
  font-size: 18px;
  color: var(--c-text-muted);
  pointer-events: none;
}

.mobile-search-input {
  width: 100%;
  height: 44px;
  padding: 0 var(--space-3) 0 40px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text);
  outline: none;
}
.mobile-search-input:focus {
  border-color: var(--c-accent);
}

.mobile-category-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-1);
  max-width: 40%;
  height: 44px;
  margin-left: var(--space-2);
  padding: 0 var(--space-3);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text-secondary);
  font-size: var(--text-base);
}

.mobile-sort-btn {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  margin-left: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background: var(--c-surface);
  color: var(--c-text-secondary);
  font-size: 18px;
}
/* Sorted: a dot like the unsaved-changes badge */
.mobile-sort-btn--active::after {
  content: '';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-accent);
}

.sort-list {
  display: flex;
  flex-direction: column;
}

.sort-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 52px;
  padding: 0 var(--space-2);
  border: none;
  border-bottom: 1px solid var(--c-border);
  background: transparent;
  color: var(--c-text);
  font-size: var(--text-lg);
  text-align: left;
  cursor: pointer;
}
.sort-option:last-child {
  border-bottom: none;
}

.sort-option-icon {
  font-size: 22px;
  color: var(--c-text-secondary);
}

.sort-option-label {
  flex: 1;
}

.sort-option--selected,
.sort-option-check {
  color: var(--c-accent);
}

.mobile-category-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
