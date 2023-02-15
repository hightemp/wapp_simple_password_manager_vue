<template>
<div v-show="bShowRepoWindow">
    <div class="block-overlay"></div>

    <div id="modal-ask-api-key" class="modal show" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Данные репозитория</h5>
                </div>
                <div class="modal-body" style="height: 500px; overflow-y: scroll">
                    <template v-if="iEditIndex!==null">
                        <div class="modal-ask-api_list_buttons">
                            <div></div>
                            <div>
                                <button type="button" class="btn btn-danger"
                                @click="fnCancelRepo">Отмена</button>
                                <button type="button" class="btn btn-primary"
                                @click="fnSaveRepo">Сохранить</button>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label for="" class="form-label">Логин</label>
                            <select class="form-control" v-model="sFromType">
                                <option value="github">github</option>
                                <option value="webdav">webdav</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="" class="form-label">Название</label>
                            <input type="text" class="form-control" v-model="sFormName">
                        </div>
                        <template v-if="sFromType=='github'">
                            <div class="mb-3">
                                <label for="" class="form-label">Логин</label>
                                <input type="text" class="form-control" v-model="sFormLogin">
                            </div>
                            <div class="mb-3">
                                <label for="" class="form-label">Репозиторий</label>
                                <input type="text" class="form-control" v-model="sFormRepo">
                            </div>
                            <div class="mb-3">
                                <label for="" class="form-label">API Ключ</label>
                                <input type="text" class="form-control" v-model="sFormKey">
                            </div>
                        </template>
                        <template v-if="sFromType=='webdav'">
                            <div class="mb-3">
                                <label for="" class="form-label">URL</label>
                                <input type="text" class="form-control" v-model="sFormURL">
                            </div>
                            <div class="mb-3">
                                <label for="" class="form-label">Пользователь</label>
                                <input type="text" class="form-control" v-model="sFormUsername">
                            </div>
                            <div class="mb-3">
                                <label for="" class="form-label">Пароль</label>
                                <input type="text" class="form-control" v-model="sFormPassword">
                            </div>
                        </template>
                    </template>
                    <template v-else>
                        <div class="modal-ask-api_list_buttons">
                            <div>
                                <input type="text" class="form-control" placeholder="Пароль от БД" v-model="sPassword">
                            </div>
                            <div class="actions">
                                <button class="btn btn-secondary" @click="fnExport">Экспортировать</button>

                                <button class="btn btn-danger" @click="fnCleanRepo">Очистить</button>

                                <button class="btn btn-success" @click="fnNewRepo">Добавить</button>
                            </div>
                        </div>
                        <div v-for="(oItem, iIndex) in aReposList" :key="iIndex" :class="'list-repo-item '+(iSelectedRepoIndex==iIndex ? 'active' : '')">
                            <template v-if="oItem">
                                <div class="list-repo-item_desc">
                                    <div class="list-repo-item_title">
                                        <div class="list-repo-item_type">{{oItem.type}}</div>
                                        <div class="list-repo-item_name">{{oItem.name}}</div>
                                    </div>
                                    <template v-if="oItem.type=='github'">
                                        <div><b>login:</b> {{oItem.login}}</div>
                                        <div><b>repo:</b> {{oItem.repo}}</div>
                                        <div><b>key:</b> {{oItem.key}}</div>
                                    </template>
                                    <template v-if="oItem.type=='webdav'">
                                        <div><b>url:</b> {{oItem.url}}</div>
                                        <div><b>username:</b> {{oItem.username}}</div>
                                        <div><b>password:</b> {{oItem.password}}</div>
                                    </template>
                                </div>
                                <div style="display:flex;align-items:start">
                                    <template v-if="oItem.type!='localstorage'">
                                    <button class="btn btn-success" @click="fnEditRepo(iIndex)" title="Редактировать"><i class="bi bi-pencil"></i></button>
                                    <button class="btn btn-danger" @click="fnRemoveRepo(iIndex)" title="Удалить"><i class="bi bi-trash"></i></button>
                                    </template>
                                    <template v-else>
                                        <div style="width: 32px; height: 29px"></div>
                                        <div style="width: 32px; height: 29px"></div>
                                    </template>
                                    <button class="btn btn-info" @click="fnSelectRepo(iIndex)" title="Выбрать"><i class="bi bi-star-fill"></i></button>
                                </div>
                            </template>
                        </div>
                    </template>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" @click="fnAcceptRepo()">Выбрать</button>
                </div>
            </div>
        </div>
    </div>
</div>
</template>

<script>

import { fnSaveFile, a, cc } from "../lib"

import { mapMutations, mapState, mapActions, mapGetters } from 'vuex'

export default {
    name: 'AskAPIWindow',

    components: {

    },

    computed: {
        ...mapState(a`iSelectedRepoIndex bShowRepoWindow`),
        ...mapGetters(a`aReposList`),
        ...cc(`sPassword`)
    },

    data() {
        return {
            iEditIndex: null,
            sFormLogin: "",
            sFormRepo: "",
            sFormKey: "",
            sFormURL: "",
            sFromType: "github",

            /**
             * { "login": "", "repo": "", "key": "", type: "", url: "", username: "", password: "", }
             */
        }
    },
    methods: {
        ...mapMutations(a`fnReposRemove fnReposSelect fnReposClean fnReposUpdate`),
        ...mapActions(a`fnPrepareRepo`),
        fnSaveRepo() {
            if (!this.sFormName) {
                alert('Надо заполнить поле - Название')
                return
            }
            var oObj = {
                "name": this.sFormName, 
                "login": this.sFormLogin, 
                "repo": this.sFormRepo, 
                "key": this.sFormKey,
                "type": this.sFromType,
                "url": this.sFormURL,
                "username": this.sFormUsername,
                "password": this.sFormPassword,
            }
            this.fnReposUpdate({ iIndex:this.iEditIndex, oObj })
            this.iEditIndex=null
        },
        fnNewRepo() {
            this.iEditIndex = -1
            this.sFormName = ""
            this.sFormLogin = ""
            this.sFormRepo = ""
            this.sFormKey = ""
            this.sFormType = "github"
            this.sFormURL = ""
            this.sFormUsername = ""
            this.sFormPassword = ""
        },
        fnEditRepo(iIndex) {
            this.iEditIndex = iIndex
            var oO = this.aReposList[this.iEditIndex]
            this.sFormName = oO.name
            this.sFormLogin = oO.login
            this.sFormRepo = oO.repo
            this.sFormKey = oO.key
            this.sFormType = oO.type
            this.sFormURL = oO.url
            this.sFormUsername = oO.username
            this.sFormPassword = oO.password
        },
        fnRemoveRepo(iIndex) {
            this.fnReposRemove(iIndex)
        },
        fnSelectRepo(iIndex) {
            this.fnReposSelect(iIndex)
        },
        fnCleanRepo() {
            this.fnReposClean()
        },
        fnCancelRepo() {
            this.iEditIndex = null
        },
        fnAcceptRepo() {
            if (!this.aReposList[this.iSelectedRepoIndex]) {
                return alert('Нужно выбрать репозиторий');
            }
            this.fnPrepareRepo()
        },
        fnExport() {
            fnSaveFile("database", JSON.stringify(this.aReposList))
        }
    },
    created()
    {
        var oThis = this
    }
}
</script>

<style>

</style>