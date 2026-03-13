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
                    <FormFields :form_name="form_name" />
                    <div class="mb-3">
                        <button type="button" class="btn btn-outline-secondary btn-sm" @click="fnGenerate">
                            <i class="bi bi-key"></i> Сгенерировать пароль
                        </button>
                        <span v-if="sGeneratedPassword" class="ms-2">
                            <code>{{sGeneratedPassword}}</code>
                            <button class="btn btn-outline-primary btn-sm ms-1" @click="fnUseGenerated">Использовать</button>
                            <button class="btn btn-outline-secondary btn-sm ms-1" @click="fnCopyGenerated">Копировать</button>
                        </span>
                    </div>
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

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDatabaseStore } from '../stores/database'
import { fnGeneratePassword } from '../crypto'
import FormFields from './forms.vue'

const props = defineProps(['title', 'form_name', 'table_name'])

const db = useDatabaseStore()

const sGeneratedPassword = ref('')

const bShow = computed(() => db.oEditWindow[props.form_name].window_show)

function fnClose() {
  sGeneratedPassword.value = ''
  db.fnHideEditWindow(props.form_name)
}

function fnSave() {
  sGeneratedPassword.value = ''
  db.fnEditWindowSave({ sTableName: props.table_name, sFormName: props.form_name })
  db.fnHideEditWindow(props.form_name)
}

function fnGenerate() {
  sGeneratedPassword.value = fnGeneratePassword(20)
}

function fnUseGenerated() {
  db.fnUpdateFormVar({ sFormName: props.form_name, sFieldName: 'password', mV: sGeneratedPassword.value })
}

function fnCopyGenerated() {
  navigator.clipboard.writeText(sGeneratedPassword.value)
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