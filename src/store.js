import { createStore } from 'vuex'

import { FileSystemDriver } from './FileSystemDriver'

import { fnRandomString } from './lib'

// NOTE: Константы
export const DATABASE_PATH = "passwords_database"
export const DATABASE_UPDATE_TIMEOUT = 30000

// Create a new store instance.
export default createStore({
    state () {
        return {
            bShowRepoWindow: true,
            aDefaultRepoList: [
                { type:"localstorage", name: "Локальное хранилище" }
            ],
            aReposList: [],
            iSelectedRepoIndex: null,

            bShowLoader: false,
            bShowSaveToast: false,

            sPassword: "",

            oStructure: {
                table: {
                    category: {
                        label: "Категория",
                        type: "text",
                    },
                    name: {
                        label: "Название",
                        type: "text",
                    },
                    login: {
                        label: "Логин",
                        type: "text",
                    },
                    password: {
                        label: "Пароль",
                        type: "text",
                    },
                    url: {
                        label: "URL",
                        type: "text",
                    },
                    description: {
                        label: "Описание",
                        type: "textarea",
                    },
                }
            },
            oDatabase: {
                table: {
                    last_index: 100,
                    data: [
                        // ...Array(100).fill({}).map((oI, iI) => ({
                        //     id: iI+1,
                        //     category: "Категория "+iI,
                        //     name: "Название "+iI,
                        //     login: "Логин "+iI,
                        //     password: "fdsgfsdgfsdgfsgwe5gdnbgdfhgdsgtrwestvrwet4q3tqgrwer43q2rgrdsgfsdgfsgf",
                        //     url: "https://stackoverflow.com/questions/46210109/how-do-i-call-a-getter-from-another-getter-in-vuex",
                        //     description: "According to ".repeat(Math.round(Math.random()*20)),
                        // }))
                    ],
                    selection_id: null,
                    filter: {
                        category: "", 
                        name: "", 
                        login: "",
                        password: "",
                        url: "",
                        description: "",
                    }
                },
            },
            oEditWindow: {
                table:{
                    window_show: false,
                    edit_item: {},
                }
            },
            oForms: {
                table: {
                    category: "",
                    name: "",
                    login: "",
                    password: "",
                    url: "",
                    description: "",
                }
            },

            sMode: "tasks",
        }
    },
    mutations: {
        fnUpdateFormVar(state, { sFormName, sFieldName, mV }) {
            state.oForms[sFormName][sFieldName] = mV
        },
        fnUpdateDatabaseVar(state, { sTableName, sVarName, mV }) {
            state.oDatabase[sTableName][sVarName] = mV
        },
        fnUpdateVar(state, { sName, sV }) {
            state[sName] = sV
        },
        fnUpdateFilter(state, { sTableName, sName, sV }) {
            state.oDatabase[sTableName].filter[sName] = sV
        },

        fnReposRemove(state, iIndex) {
            state.aReposList.splice(iIndex-state.aDefaultRepoList.length, 1)
            localStorage.setItem('aReposList', JSON.stringify(state.aReposList))
        },
        fnReposSelect(state, iIndex) {
            state.iSelectedRepoIndex = iIndex
        },
        fnReposClean(state) {
            state.aReposList = []
            localStorage.setItem('aReposList', JSON.stringify(state.aReposList))
        },
        fnReposUpdate(state, { iIndex, oObj }) {
            if (iIndex==-1) {
                state.aReposList.push(oObj)
            } else {
                state.aReposList.splice(iIndex-state.aDefaultRepoList.length, 1, oObj)
            }
            localStorage.setItem('aReposList', JSON.stringify(state.aReposList))
        },
        fnLoadRepos(state) {
            try { 
                state.aReposList = JSON.parse(localStorage.getItem('aReposList') || '[]')
            } catch(_) {

            }
        },

        fnUpdateDatabase(state, oDatabase) {
            state.oDatabase = oDatabase
        },

        fnHideRepoWindow(state) {
            state.bShowRepoWindow = false
        },
        fnShowRepoWindow(state) {
            state.bShowRepoWindow = true
        },
        fnShowLoader(state) {
            state.bShowLoader = true
        },
        fnHideLoader(state) {
            state.bShowLoader = false
        },

        fnHideEditWindow(state, sFormName) {
            state.oEditWindow[sFormName].window_show = false
        },
        fnShowEditWindow(state, { sFormName, oItem }) {
            state.oEditWindow[sFormName].window_show = true
            state.oEditWindow[sFormName].edit_item = oItem
            for (var sN in state.oForms[sFormName]) {
                if (sN in oItem) {
                    state.oForms[sFormName][sN] = oItem[sN]
                } else {
                    state.oForms[sFormName][sN] = ""
                }
            }
        },
        fnEditWindowSave(state, { sTableName, sFormName }) {
            for (var sN in state.oForms[sFormName]) {
                state.oEditWindow[sFormName].edit_item[sN] = state.oForms[sFormName][sN]
            }
            if (!state.oEditWindow[sFormName].edit_item.id) {
                state.oEditWindow[sFormName].edit_item.id = ++state.oDatabase[sTableName][`last_index`]
                state.oDatabase[sTableName][`data`].push(state.oEditWindow[sFormName].edit_item)
            }
        },
        fnRemoveFromTable(state, { sTableName, oItem }) {
            state.oDatabase[sTableName][`data`] = state.oDatabase[sTableName][`data`].filter((oI) => oI.id != oItem.id)
        }
    },
    actions: {
        fnPrepareRepo({ commit, state, dispatch, getters }) {
            commit('fnHideRepoWindow')
            FileSystemDriver.fnInit(getters.oCurrentRepo)
            dispatch('fnLoadDatabase')
        },
        fnSaveDatabase({ commit, state }) {
            return FileSystemDriver.fnWriteFileCryptoJSON(DATABASE_PATH, state.oDatabase, state.sPassword)
                .catch(() => {
                    FileSystemDriver.fnReadFile(DATABASE_PATH)
                        .then(() => {
                            return FileSystemDriver.fnWriteFileCryptoJSON(DATABASE_PATH, state.oDatabase, state.sPassword)
                        })
                })
        },
        fnLoadDatabase({ commit, state }) {
            commit('fnShowLoader')
            FileSystemDriver
                .fnReadFileCryptoJSON(DATABASE_PATH, state.sPassword)
                .then((mData) => {
                    if (!mData) throw "Cannot destructure property"
                    commit('fnUpdateDatabase', mData)
                    // commit('fnUpdateDatabase', mData=demo_database)
                    commit('fnHideLoader')
                })
                .catch((oE) => {
                    console.error(oE)
                    if ((oE+"").match(/Malformed UTF-8 data/)) {
                        alert("Не правильный пароль");
                        commit('fnShowRepoWindow')
                    }
                    if ((oE+"").match(/Cannot destructure property/)
                        || (oE+"").match(/Not Found/)) {
                        FileSystemDriver.fnWriteFileCryptoJSON(DATABASE_PATH, state.oDatabase, state.sPassword)
                            .then(() => {
                                FileSystemDriver
                                    .fnReadFileCryptoJSON(DATABASE_PATH, state.sPassword)
                                    .then((mData) => { 
                                        commit('fnUpdateDatabase', mData)
                                        commit('fnHideLoader')
                                    })
                            })
                    }
                })
        },
        fnDropDatabase({ commit, state }) {
            localStorage.setItem(DATABASE_PATH, null)
        },
        fnGetFieldValue: ({ state, getters }) => (sFormName, sFieldName) => {
            return getters.fnGetFieldValue(sFormName, sFieldName)
        },
    },
    getters: {
        fnGetFieldValue: (state) => (sFormName, sFieldName) => {
            return state.oForms[sFormName][sFieldName]
        },
        aReposList(state) {
            return state.aDefaultRepoList.concat(state.aReposList)
        },
        oCurrentRepo(state, getters) {
            return getters.aReposList[state.iSelectedRepoIndex]
        },

        fnFilterGroups: (state) => (sFilter) => {
            return state.oDatabase.tasks_groups.filter((oI) => ~oI.name.indexOf(sFilter))
        },
    }
})