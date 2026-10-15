<template>
  <aside class="sidebar">
    <div class="sidebar-group">
      <button
        v-for="item in TOP_ITEMS"
        :key="item.id"
        class="sidebar-btn"
        :title="item.title"
        :aria-label="item.title"
        @click="emit('action', item.id)"
      >
        <div v-if="item.id === 'save'" :class="justSaved ? 'i-lucide-check' : item.icon" :style="justSaved ? 'color:var(--c-success)' : ''" />
        <div v-else :class="item.icon" />
        <span v-if="item.id === 'save' && unsavedChanges && !justSaved" class="sidebar-badge" />
      </button>
    </div>

    <div class="sidebar-group">
      <button class="sidebar-btn" title="Export" aria-label="Export" @click="emit('action', 'export')">
        <div class="i-lucide-download" />
      </button>
      <button class="sidebar-btn" title="Import" aria-label="Import" @click="emit('action', 'import')">
        <div class="i-lucide-upload" />
      </button>
      <button class="sidebar-btn" title="Import from another app" aria-label="Import from another app" @click="emit('action', 'import-other')">
        <div class="i-lucide-file-input" />
      </button>
    </div>

    <div class="sidebar-group">
      <button class="sidebar-btn" title="Security report" aria-label="Security report" @click="emit('action', 'security-report')">
        <div class="i-lucide-shield-check" />
      </button>
    </div>

    <div class="sidebar-spacer" />

    <div class="sidebar-group">
      <button class="sidebar-btn" title="Keyboard Shortcuts" aria-label="Keyboard Shortcuts" @click="emit('action', 'shortcuts')">
        <div class="i-lucide-keyboard" />
      </button>
      <button class="sidebar-btn" :title="siteIconsLabel" :aria-label="siteIconsLabel" :aria-pressed="siteIconsEnabled" @click="emit('action', 'toggle-site-icons')">
        <div :class="siteIconsEnabled ? 'i-lucide-image' : 'i-lucide-image-off'" />
      </button>
      <button class="sidebar-btn" :title="themeLabel" :aria-label="themeLabel" @click="emit('action', 'toggle-theme')">
        <div :class="isDarkTheme ? 'i-lucide-sun' : 'i-lucide-moon'" />
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MenuAction } from '@/types/menu'
import { useSiteIcons } from '@/composables/useSiteIcons'

const props = defineProps<{
  unsavedChanges: number
  justSaved: boolean
  isDarkTheme: boolean
}>()

const emit = defineEmits<{ (e: 'action', action: MenuAction): void }>()

const TOP_ITEMS: { id: MenuAction; title: string; icon: string }[] = [
  { id: 'repo-window', title: 'Select Repository', icon: 'i-lucide-database' },
  { id: 'save', title: 'Save', icon: 'i-lucide-save' },
  { id: 'change-password', title: 'Change Password', icon: 'i-lucide-key-round' },
  { id: 'add', title: 'Add', icon: 'i-lucide-plus' },
  { id: 'edit', title: 'Edit', icon: 'i-lucide-pencil' },
  { id: 'remove', title: 'Delete', icon: 'i-lucide-trash-2' },
]

const themeLabel = computed(() => props.isDarkTheme ? 'Light theme' : 'Dark theme')

const { siteIconsEnabled } = useSiteIcons()
const siteIconsLabel = computed(() => siteIconsEnabled.value ? 'Hide website icons' : 'Show website icons')
</script>

<style scoped>
/* ===== Sidebar ===== */
.sidebar {
  width: 56px;
  height: 100%;
  background: var(--c-bg-elevated);
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  padding: var(--space-2);
  gap: var(--space-1);
  flex-shrink: 0;
}

.sidebar-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.sidebar-group + .sidebar-group {
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--c-border);
}

.sidebar-spacer { flex: 1; }

.sidebar-btn {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: 20px;
}
.sidebar-btn:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}
.sidebar-btn:active {
  transform: scale(0.95);
}

.sidebar-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--c-danger);
  border-radius: var(--radius-full);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.8); }
}
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }
}
</style>
