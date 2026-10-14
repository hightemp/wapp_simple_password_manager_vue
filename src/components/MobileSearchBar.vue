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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useEntryList } from '@/composables/useEntryList'
import { useCategoryState } from '@/composables/useCategoryState'
import { pathName } from '@/utils/categories'
import { entryType, EXPIRING_FILTER } from '@/types/entryTypes'

const emit = defineEmits<{
  (e: 'pick-category'): void
}>()

const { searchQuery, isTrashView, activeCategories } = useEntryList()
const { typeFilter } = useCategoryState()

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

.mobile-category-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
