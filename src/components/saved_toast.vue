<template>
<div class="toast-container position-fixed top-0 end-0 p-3">
    <div
        v-if="bShowSaveToast" 
        class="toast fade show" role="alert" aria-live="assertive" aria-atomic="true"
    >
        <div class="toast-header">
            <strong class="me-auto">Сохранено</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            Данные были сохранены
        </div>
    </div>
</div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useDatabaseStore } from '../stores/database'

const db = useDatabaseStore()

const bShowSaveToast = computed({
  get: () => db.bShowSaveToast,
  set: (v) => { db.bShowSaveToast = v },
})

watch(bShowSaveToast, (bN) => {
  if (bN) {
    setTimeout(() => { bShowSaveToast.value = false }, 2000)
  }
})
</script>

<style>

</style>