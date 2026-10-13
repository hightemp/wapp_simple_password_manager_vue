<template>
  <div class="card-list">
    <div v-if="entries.length === 0" class="card-list-empty">
      <div :class="inTrash ? 'i-lucide-trash-2' : 'i-lucide-database'" class="card-list-empty-icon" />
      <p class="card-list-empty-title">{{ isSearching ? 'Nothing found' : inTrash ? 'Trash is empty' : 'No entries' }}</p>
      <p class="card-list-empty-sub">
        <template v-if="isSearching">Try a different search</template>
        <template v-else-if="inTrash">Deleted entries appear here</template>
        <template v-else>Tap <strong>+</strong> to create your first entry</template>
      </p>
    </div>

    <div
      v-for="(entry, index) in entries"
      :key="entry.id ?? index"
      class="entry-card"
      role="button"
      tabindex="0"
      @click="emit('open', entry)"
      @keydown.enter="emit('open', entry)"
    >
      <div class="entry-card-main">
        <div class="entry-card-title-row">
          <div :class="[entryType(entry).icon, 'entry-card-type']" :title="entryType(entry).label" />
          <span class="entry-card-name">{{ entry.name || '(no name)' }}</span>
          <ExpiryBadge :entry="entry" />
          <span v-if="entry.category" class="entry-card-category">{{ entry.category }}</span>
        </div>
        <span v-if="entryType(entry).details(entry)" class="entry-card-login">{{ entryType(entry).details(entry) }}</span>
      </div>

      <div class="entry-card-actions">
        <button
          v-for="item in quickCopy(entry)"
          :key="item.key"
          class="entry-card-btn"
          :aria-label="`Copy ${item.label.toLowerCase()}`"
          @click.stop="emit('copy', entry, item.key)"
        >
          <div :class="copiedCells.has(item.key + '-' + entry.id) ? 'i-lucide-check copied' : item.icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '@/stores/database'
import { entryType, describeField, copyIcon } from '@/types/entryTypes'
import ExpiryBadge from './ExpiryBadge.vue'

defineProps<{
  entries: Entry[]
  // Keys like "password-12" of buttons that were just used, to show a check mark
  copiedCells: Set<string>
  isSearching: boolean
  inTrash?: boolean
}>()

const emit = defineEmits<{
  (e: 'open', entry: Entry): void
  (e: 'copy', entry: Entry, field: string): void
}>()

/** Copy buttons on a card: the type's quick-copy fields that have a value (at most 2) */
function quickCopy(entry: Entry) {
  return entryType(entry).quickCopy
    .filter((key) => entry[key])
    .slice(0, 2)
    .map((key) => ({ key, label: describeField(entry, key).label, icon: copyIcon(key) }))
}
</script>

<style scoped>
.card-list {
  display: flex;
  flex-direction: column;
}

.entry-card {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 64px;
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg-elevated);
  cursor: pointer;
  -webkit-user-select: none;
  user-select: none;
}
.entry-card:active {
  background: var(--c-bg-hover);
}

.entry-card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entry-card-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.entry-card-type {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--c-text-muted);
}

.entry-card-name {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-card-category {
  flex-shrink: 0;
  max-width: 40%;
  padding: 1px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--c-bg-hover);
  color: var(--c-text-secondary);
  font-size: var(--text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-card-login {
  font-size: var(--text-base);
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-card-actions {
  display: flex;
  flex-shrink: 0;
}

.entry-card-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
  font-size: 20px;
}
.entry-card-btn:active {
  background: var(--c-bg-hover);
}
.copied {
  color: var(--c-success);
}

.card-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-8) var(--space-4);
  text-align: center;
}
.card-list-empty-icon {
  font-size: 48px;
  color: var(--c-text-muted);
  opacity: 0.3;
  margin-bottom: var(--space-4);
}
.card-list-empty-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--c-text-secondary);
}
.card-list-empty-sub {
  font-size: var(--text-sm);
  color: var(--c-text-muted);
}
</style>
