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
          <span class="entry-card-name">{{ entry.name || '(no name)' }}</span>
          <span v-if="entry.category" class="entry-card-category">{{ entry.category }}</span>
        </div>
        <span v-if="entry.login" class="entry-card-login">{{ entry.login }}</span>
      </div>

      <div class="entry-card-actions">
        <button
          v-if="entry.login"
          class="entry-card-btn"
          aria-label="Copy login"
          @click.stop="emit('copy', entry, 'login')"
        >
          <div :class="copiedCells.has('login-' + entry.id) ? 'i-lucide-check copied' : 'i-lucide-user'" />
        </button>
        <button
          v-if="entry.password"
          class="entry-card-btn"
          aria-label="Copy password"
          @click.stop="emit('copy', entry, 'password')"
        >
          <div :class="copiedCells.has('password-' + entry.id) ? 'i-lucide-check copied' : 'i-lucide-key-round'" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '@/stores/database'

defineProps<{
  entries: Entry[]
  // Keys like "password-12" of buttons that were just used, to show a check mark
  copiedCells: Set<string>
  isSearching: boolean
  inTrash?: boolean
}>()

const emit = defineEmits<{
  (e: 'open', entry: Entry): void
  (e: 'copy', entry: Entry, field: 'login' | 'password'): void
}>()
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
