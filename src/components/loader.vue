<template>
  <Teleport to="body">
    <Transition name="loader">
      <div v-if="bShowLoader" class="loader-overlay">
        <div class="loader-spinner">
          <svg class="spinner-svg" viewBox="0 0 50 50">
            <circle class="spinner-circle" cx="25" cy="25" r="20" fill="none" stroke-width="4" />
          </svg>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDatabaseStore } from '../stores/database'

const db = useDatabaseStore()
const bShowLoader = computed(() => db.bShowLoader)
</script>

<style scoped>
.loader-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(2px);
}

.loader-spinner {
  width: 48px;
  height: 48px;
}

.spinner-svg {
  animation: rotate 1.4s linear infinite;
}

.spinner-circle {
  stroke: var(--c-accent);
  stroke-linecap: round;
  animation: dash 1.4s ease-in-out infinite;
}

@keyframes rotate {
  100% { transform: rotate(360deg); }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 150;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -35;
  }
  100% {
    stroke-dasharray: 90, 150;
    stroke-dashoffset: -124;
  }
}

.loader-enter-active,
.loader-leave-active {
  transition: opacity 200ms ease;
}
.loader-enter-from,
.loader-leave-to {
  opacity: 0;
}
</style>