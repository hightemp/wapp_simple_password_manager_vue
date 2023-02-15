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

<script>

import { mapMutations, mapState, mapActions, mapGetters } from 'vuex'

import { a, cc } from "../lib"

export default {
    name: 'SavedToast',

    components: {

    },

    computed: {
        ...cc(`bShowSaveToast`),
    },

    data() {
        return {
        }
    },

    watch: {
        bShowSaveToast(bN, bO) {
            if (bN) {
                setTimeout(() => {
                    this.bShowSaveToast = false
                }, 2000)
            }
        }
    },
}
</script>

<style>

</style>