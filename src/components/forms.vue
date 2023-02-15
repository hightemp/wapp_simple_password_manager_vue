<template>
    <template v-for="(oItem, sFieldName) in oItems" :key="oItem">
        <form_component :item="oItem" @input="(mV) => fnInput(mV, sFieldName)" :value="fnGetFieldValue(this.form_name, sFieldName)" />
    </template>
</template>

<script>

import { mapMutations, mapState, mapActions, mapGetters } from 'vuex'
import { a, cc } from "../lib"

import form_component from "./form_component.vue"

export default {
    props: ['form_name'],

    components: {
        form_component
    },

    computed: {
        oItems() {
            return this.$store.state.oStructure[this.form_name]
        },
    },

    methods: {
        fnGetFieldValue(sFormName, sFieldName) {
            return this.$store.getters.fnGetFieldValue(sFormName, sFieldName)
        },
        fnInput(mV, sFieldName) {
            this.$store.commit('fnUpdateFormVar', { sFormName: this.form_name, sFieldName, mV })
        }
    }
}
</script>

<style>

</style>