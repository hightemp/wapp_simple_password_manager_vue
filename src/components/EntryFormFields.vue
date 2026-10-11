<template>
  <FormField
    v-for="(field, fieldName) in fields"
    :key="fieldName"
    :field="field"
    :model-value="db.getFormField(formName, fieldName)"
    @update:model-value="(value) => db.setFormField(formName, fieldName, value)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDatabaseStore } from '@/stores/database'
import FormField from './FormField.vue'

const props = defineProps<{ formName: string }>()
const db = useDatabaseStore()

const fields = computed(() => db.structure[props.formName])
</script>
