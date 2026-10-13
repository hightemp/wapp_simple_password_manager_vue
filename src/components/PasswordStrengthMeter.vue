<template>
  <div class="strength" :data-score="strength.score" aria-live="polite">
    <div class="strength-bar" aria-hidden="true">
      <span v-for="i in 4" :key="i" :class="['strength-segment', { filled: password && i <= Math.max(1, strength.score) }]" />
    </div>
    <div v-if="password" class="strength-text">
      <span class="strength-label">{{ strength.label }}</span>
      <span v-if="strength.hints.length" class="strength-hint">{{ strength.hints[0] }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { estimateStrength } from '@/utils/passwordStrength'

const props = defineProps<{ password: string }>()

const strength = computed(() => estimateStrength(props.password))
</script>

<style scoped>
.strength {
  --strength-color: var(--c-danger);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.strength[data-score="2"] { --strength-color: var(--c-warning, #f59e0b); }
.strength[data-score="3"],
.strength[data-score="4"] { --strength-color: var(--c-success); }

.strength-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.strength-segment {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--c-border);
  transition: background var(--transition-fast);
}
.strength-segment.filled {
  background: var(--strength-color);
}

.strength-text {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--space-2);
  font-size: var(--text-xs);
}

.strength-label {
  font-weight: 600;
  color: var(--strength-color);
}

.strength-hint {
  color: var(--c-text-secondary);
}
</style>
