<template>
  <Teleport to="body">
    <TransitionGroup name="notif" tag="div" class="notification-stack">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        :class="['notification', `notification--${notif.type}`]"
        role="alert"
      >
        <div class="notification-icon">
          <div v-if="notif.type === 'success'" class="i-lucide-check-circle" />
          <div v-else-if="notif.type === 'error'" class="i-lucide-alert-circle" />
          <div v-else class="i-lucide-info" />
        </div>
        <div class="notification-content">
          <div class="notification-title">{{ notif.title }}</div>
          <div v-if="notif.message" class="notification-message">{{ notif.message }}</div>
        </div>
        <button class="notification-dismiss" @click="dismiss(notif.id)" aria-label="Dismiss">
          <div class="i-lucide-x" />
        </button>
        <div class="notification-progress">
          <div class="notification-progress-bar" :style="{ animationDuration: notif.duration + 'ms' }" />
        </div>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Notification {
  id: number
  title: string
  message?: string
  type: 'success' | 'error' | 'info'
  duration: number
}

const notifications = ref<Notification[]>([])
let nextId = 0

function show(title: string, message = '', type: 'success' | 'error' | 'info' = 'success', duration = 3000) {
  const id = ++nextId
  notifications.value.push({ id, title, message, type, duration })
  setTimeout(() => dismiss(id), duration)
}

function dismiss(id: number) {
  const idx = notifications.value.findIndex((n) => n.id === id)
  if (idx !== -1) notifications.value.splice(idx, 1)
}

defineExpose({ show })
</script>

<style scoped>
.notification-stack {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
  max-width: 360px;
  width: 100%;
}

.notification {
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--c-bg-elevated);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  position: relative;
  overflow: hidden;
}

.notification--success .notification-icon { color: var(--c-success); }
.notification--error .notification-icon { color: var(--c-danger); }
.notification--info .notification-icon { color: var(--c-accent); }

.notification-icon {
  flex-shrink: 0;
  font-size: 20px;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--c-text);
}

.notification-message {
  font-size: var(--text-xs);
  color: var(--c-text-secondary);
  margin-top: 2px;
}

.notification-dismiss {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--c-text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}
.notification-dismiss:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}

.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--c-bg-hover);
}

.notification-progress-bar {
  height: 100%;
  background: var(--c-accent);
  animation: progress-shrink linear forwards;
}

@keyframes progress-shrink {
  from { width: 100%; }
  to { width: 0%; }
}

/* Transitions */
.notif-enter-active {
  transition: all 300ms ease;
}
.notif-leave-active {
  transition: all 200ms ease;
}
.notif-enter-from {
  transform: translateX(100%);
  opacity: 0;
}
.notif-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
.notif-move {
  transition: transform 200ms ease;
}
</style>
