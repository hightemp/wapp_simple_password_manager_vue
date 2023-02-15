<template>
    <div v-if="bShow">
        <div class="overlay"></div>
        <div class="modal show">
            <div class="modal-dialog">
                <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">{{title}}</h5>
                    <button type="button" class="btn-close" @click="fnClose"></button>
                </div>
                <div class="modal-body">
                    <forms :form_name="form_name" />
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" @click="fnClose">Отмена</button>
                    <button type="button" class="btn btn-primary" @click="fnSave">Сохранить</button>
                </div>
            </div>
        </div>

    </div>
</div>
</template>

<script>
import forms from "./forms.vue"
import { mapMutations, mapState, mapActions, mapGetters } from 'vuex'
import { a, cc } from "../lib"

export default {
    props: ['title', 'form_name', 'table_name'],

    components: {
        forms
    },

    computed: {
        bShow() { 
            return this.$store.state.oEditWindow[this.form_name].window_show 
        }
    },

    methods: {
        ...mapMutations(a`fnHideEditWindow fnEditWindowSave`),
        fnClose() {
            this.fnHideEditWindow(this.form_name)
        },
        fnSave() {
            this.fnEditWindowSave({ sTableName: this.table_name, sFormName: this.form_name })
            this.fnHideEditWindow(this.form_name)
        }
    }
}
</script>

<style>
.show {
    display: block !important;
}
.overlay {
    position: absolute;
    top: 0px;
    left: 0px;
    right: 0px;
    bottom: 0px;
    background: rgba(0,0,0,0.4);
    z-index: 100;
}
</style>