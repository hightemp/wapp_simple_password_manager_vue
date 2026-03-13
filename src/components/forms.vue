<template>
    <template v-for="(oItem, sFieldName) in oItems" :key="oItem">
        <FormComponent :item="oItem" @input="(mV) => fnInput(mV, sFieldName)" :value="db.fnGetFieldValue(props.form_name, sFieldName)" />
    </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDatabaseStore } from '../stores/database'
import FormComponent from './form_component.vue'

const props = defineProps(['form_name'])
const db = useDatabaseStore()

const oItems = computed(() => db.oStructure[props.form_name])

function fnInput(mV, sFieldName) {
  db.fnUpdateFormVar({ sFormName: props.form_name, sFieldName, mV })
}
</script>

<style>

</style>