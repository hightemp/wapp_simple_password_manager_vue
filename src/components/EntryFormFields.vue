<template>
  <FormField
    v-for="(field, fieldName) in db.columns"
    :key="fieldName"
    :field="field"
    :model-value="db.form[fieldName]"
    @update:model-value="(value) => db.setFormField(fieldName, value as string)"
  />
</template>

<script setup lang="ts">
import { useDatabaseStore } from '@/stores/database'
import FormField from './FormField.vue'

const db = useDatabaseStore()
</script>
