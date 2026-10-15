<template>
  <BaseModal v-model="isOpen" title="More" size="sm">
    <nav class="menu-list">
      <button v-for="item in items" :key="item.action" class="menu-item" @click="choose(item.action)">
        <div :class="item.icon" class="menu-item-icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MenuAction } from '@/types/menu'
import { useSiteIcons } from '@/composables/useSiteIcons'
import BaseModal from './BaseModal.vue'

const props = defineProps<{ isDarkTheme: boolean }>()
const emit = defineEmits<{ (e: 'action', action: MenuAction): void }>()
const isOpen = defineModel<boolean>({ required: true })

const { siteIconsEnabled } = useSiteIcons()

const items = computed<{ action: MenuAction; label: string; icon: string }[]>(() => [
  { action: 'export', label: 'Export database', icon: 'i-lucide-download' },
  { action: 'import', label: 'Import database', icon: 'i-lucide-upload' },
  { action: 'import-other', label: 'Import from another app', icon: 'i-lucide-file-input' },
  { action: 'security-report', label: 'Security report', icon: 'i-lucide-shield-check' },
  { action: 'change-password', label: 'Change master password', icon: 'i-lucide-key-round' },
  { action: 'toggle-theme', label: props.isDarkTheme ? 'Light theme' : 'Dark theme', icon: props.isDarkTheme ? 'i-lucide-sun' : 'i-lucide-moon' },
  {
    action: 'toggle-site-icons',
    label: siteIconsEnabled.value ? 'Hide website icons' : 'Show website icons',
    icon: siteIconsEnabled.value ? 'i-lucide-image-off' : 'i-lucide-image',
  },
  { action: 'lock', label: 'Lock', icon: 'i-lucide-lock' },
])

function choose(action: MenuAction) {
  isOpen.value = false
  emit('action', action)
}
</script>

<style scoped>
.menu-list {
  display: flex;
  flex-direction: column;
}

.menu-item {
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
.menu-item:last-child {
  border-bottom: none;
}
.menu-item:active {
  background: var(--c-bg-hover);
}

.menu-item-icon {
  font-size: 22px;
  color: var(--c-text-secondary);
}
</style>
