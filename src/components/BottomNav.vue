<template>
  <nav class="bottom-nav">
    <button class="bottom-nav-btn" @click="emit('action', 'repo-window')" aria-label="Repository">
      <div class="i-lucide-database" />
    </button>
    <button class="bottom-nav-btn" @click="emit('action', 'add')" aria-label="Add">
      <div class="i-lucide-plus" />
    </button>
    <button class="bottom-nav-btn" @click="emit('action', 'save')" aria-label="Save">
      <div class="i-lucide-save" />
      <span v-if="unsavedChanges" class="sidebar-badge" />
    </button>
    <button class="bottom-nav-btn" @click="emit('action', 'more')" aria-label="More">
      <div class="i-lucide-menu" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import type { MenuAction } from '@/types/menu'

defineProps<{
  unsavedChanges: number
}>()

const emit = defineEmits<{ (e: 'action', action: MenuAction): void }>()
</script>

<style scoped>
/* ===== Bottom Navigation (Mobile) ===== */
.bottom-nav {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  /* 56px of buttons plus the iOS home indicator area */
  height: calc(56px + env(safe-area-inset-bottom));
  background: var(--c-bg-elevated);
  border-top: 1px solid var(--c-border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: var(--z-header);
}

.bottom-nav-btn {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 22px;
  cursor: pointer;
  transition: color var(--transition-fast);
}
.bottom-nav-btn:active {
  color: var(--c-accent);
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
  .bottom-nav {
    display: flex;
  }
}
</style>
