<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @keydown.esc="onEsc"
        @mousedown.self="onOverlayClick"
        ref="overlayRef"
      >
        <div :class="['modal-panel', sizeClass]" ref="panelRef">
          <div class="modal-header" v-if="$slots.header || title">
            <slot name="header">
              <h2 class="modal-title" :id="titleId">{{ title }}</h2>
            </slot>
            <button
              v-if="closable"
              class="modal-close"
              @click="close"
              aria-label="Close"
            >
              <div class="i-lucide-x" />
            </button>
          </div>
          <div class="modal-body">
            <slot />
          </div>
          <div class="modal-footer" v-if="$slots.footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  size?: 'sm' | 'md' | 'lg'
  closable?: boolean
  persistent?: boolean
}>(), {
  title: '',
  size: 'md',
  closable: true,
  persistent: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const overlayRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

let uid = 0
const titleId = `modal-title-${++uid}`

const sizeClass = computed(() => `modal-${props.size}`)

function close() {
  emit('update:modelValue', false)
}

function onEsc() {
  if (!props.persistent) close()
}

function onOverlayClick() {
  if (!props.persistent) close()
}

// Focus trap
function getFocusableElements(): HTMLElement[] {
  if (!panelRef.value) return []
  return Array.from(
    panelRef.value.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  )
}

function handleTab(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const focusable = getFocusableElements()
  if (!focusable.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault()
      last.focus()
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
}

watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
    await nextTick()
    overlayRef.value?.addEventListener('keydown', handleTab)
    // Focus first focusable element
    const els = getFocusableElements()
    if (els.length) els[0].focus()
  } else {
    document.body.style.overflow = ''
    overlayRef.value?.removeEventListener('keydown', handleTab)
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-var: var(--z-overlay);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  padding: var(--space-4);
}

.modal-panel {
  position: relative;
  z-index: 101;
  background: var(--c-bg-elevated);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-overlay);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal-sm { width: 100%; max-width: 400px; }
.modal-md { width: 100%; max-width: 560px; }
.modal-lg { width: 100%; max-width: 800px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--c-text);
  margin: 0;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--c-text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.modal-close:hover {
  background: var(--c-bg-hover);
  color: var(--c-text);
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--c-border);
  flex-shrink: 0;
}

/* Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}
.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 200ms ease, opacity 200ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-panel {
  transform: scale(0.95);
  opacity: 0;
}
.modal-leave-to .modal-panel {
  transform: scale(0.95);
  opacity: 0;
}

@media (max-width: 640px) {
  .modal-panel {
    max-height: 95vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    align-self: flex-end;
  }
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }
  .modal-sm, .modal-md, .modal-lg {
    max-width: 100%;
  }
}
</style>
