<template>
  <span
    v-if="status"
    :class="['expiry-badge', `expiry-badge--${status}`]"
    :title="title"
    :aria-label="title"
  >
    <div :class="status === 'expired' ? 'i-lucide-calendar-x' : 'i-lucide-calendar-clock'" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { expiryDate, expiryStatus } from '@/types/entryTypes'

const props = defineProps<{ entry: Record<string, any> }>()

const status = computed(() => expiryStatus(props.entry))
const title = computed(() => {
  const date = expiryDate(props.entry)?.toLocaleDateString()
  return status.value === 'expired' ? `Expired on ${date}` : `Expires on ${date}`
})
</script>

<style scoped>
.expiry-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
}
.expiry-badge--soon {
  color: var(--c-warning);
}
.expiry-badge--expired {
  color: var(--c-danger);
}
</style>
