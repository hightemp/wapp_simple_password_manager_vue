<template>
  <div class="wrapper">
    <div class="left-panel">
      <button v-for="(oMenuItem, iI) in aMenu" :key="iI" class="btn btn-menu" @click="fnClickLeftMenu(oMenuItem)" :title="oMenuItem.title">
        <template v-if="oMenuItem.id=='save'">
          <div class="repos-list">
            <template v-for="oRepo in aReposList" :key="oRepo">
              <div class="repo-list_item">
                <label><input type="checkbox" v-model="oRepo.need_save" />{{ oRepo.name }}</label>
              </div>
            </template>
          </div>
        </template>
        <i :class="'bi '+oMenuItem.icon"></i>
        <template v-if="oMenuItem.id=='save' && iUnsavedChanges">
          <span class="badge">{{iUnsavedChanges}}</span>
        </template>
      </button>
      <button class="btn btn-import" title="Импортировать"><i class="bi bi-box-arrow-in-up"></i><label><input type="file" ref="file_selector" @change="fnFileImportChange" /></label></button>
    </div>
    <div class="table-panel">
      <div class="table-actions-panel">
        <div class="spacer"></div>
        <button class="btn btn-light" @click="fnFirst"><i class="bi bi-chevron-bar-left"></i></button>
        <button class="btn btn-light" @click="fnPrevShift"><i class="bi bi-chevron-double-left"></i></button>
        <button class="btn btn-light" @click="fnPrev"><i class="bi bi-chevron-compact-left"></i></button>
        <div class="input-group mb-3">
            <input type="text" class="form-control" v-model="iPage" />
            <span class="input-group-text" id="basic-addon1">/ {{iMaxPages}}</span>
        </div>
        <button class="btn btn-light" @click="fnNext"><i class="bi bi-chevron-compact-right"></i></button>
        <button class="btn btn-light" @click="fnNextShift"><i class="bi bi-chevron-double-right"></i></button>
        <button class="btn btn-light" @click="fnLast"><i class="bi bi-chevron-bar-right"></i></button>
        <div class="spacer"></div>
      </div>
      <div class="table">
          <div class="table-row header" :style="sHeaderStyles">
              <div v-for="(oSF, sK) in oStruct" :key="sK" class="cell header">
                  {{oSF.label}}
                  <input type="text" class="form-control" @input="(oE) => fnFilterInput(oE, sK)" :value="oTable.filter[sK]"  />
              </div>
          </div>
          <!-- {{aRows}} -->
          <template v-for="oRow in aSlicedRows" :key="oRow">
              <div 
                  :class="'table-row '+(oSelectedItem && oSelectedItem.id == oRow.id ? 'active' : '')" 
                  :style="sHeaderStyles" 
                  @click="(oE) => fnItemClick(oRow)"
                  @dblclick="(oE) => fnDblItemClick(oRow)"
              >
                  <div v-for="(oSF, sK) in oStruct" :key="sK" class="cell">
                    <template v-if="oRow[sK] && sK=='url'">
                      <a :href="oRow[sK]">{{oRow[sK]}}</a>
                    </template>
                    <template v-else>
                      <template v-if="oRow[sK] && (sK=='password' || sK=='login')">
                        <button 
                          class="btn btn-light copy-to-clipboard"
                          @click="fnCopyToClipboard(oRow[sK])"
                        ><i class="bi bi-clipboard-check"></i></button>
                      </template>
                      {{oRow[sK]}}
                    </template>
                  </div>
              </div>
          </template>
      </div>
    </div>
  </div>

  <edit_window title="Редактирование" :form_name="sTableName" :table_name="sTableName" />
  <repo_window />
  <saved_toast />
  <loader/>
</template>

<script>

import { mapMutations, mapState, mapActions, mapGetters } from 'vuex'
import { a, cc } from "./lib"

import edit_window from "./components/edit_window.vue"
import repo_window from "./components/repo_window.vue"
import saved_toast from "./components/saved_toast.vue"
import loader from './components/loader.vue'

export default {
  name: 'App',

  components: {
    edit_window,
    repo_window,
    saved_toast,
    loader,
  },

  computed: {
    ...cc(`bShowRepoWindow bShowSaveToast sPassword`),
    ...mapGetters(a`aReposList`),
    ...mapState(a`iUnsavedChanges`),
    sHeaderStyles() {
      return {display:'grid', 'grid-template-columns': '1fr '.repeat(this.iStructLength) }
    },
    iStructLength() {
        return Object.keys(this.oStruct).length
    },
    oStruct() {
        return this.$store.state.oStructure['table']
    },
    oTable() {
        return this.$store.state.oDatabase['table']
    },
    iMaxPages() {
        return Math.ceil(this.aRows.length / this.iPageCount)
    },
    iPage: {
      get() { return this.$store.state.oDatabase['table'].page ?? 1 },
      set(sV) { this.$store.state.oDatabase['table'].page = sV*1 },
    },
    iPageCount() {
      return Math.floor((window.innerHeight - 60 - 30) / 27)
    },
    aRows() {
        var aRows = this.oTable.data.filter((oI) => {
            var bResult = true;
            for (var sK in this.oTable.filter) {
                console.log(this.oTable.filter[sK])
                if (this.oTable.filter[sK]) {
                    console.log(this.oTable.filter[sK])
                    bResult = bResult && ~oI[sK].indexOf(this.oTable.filter[sK])
                }
            }
            return bResult
        })

        return aRows;
    },
    aSlicedRows() {
        var aRows = this.aRows.slice((this.iPage-1)*this.iPageCount, this.iPage*this.iPageCount)
        return aRows;
    },
  },

  data() {
    return {
      aMenu: [
        { id: "repo-window", title: "Выбрать репозиторий", icon: "bi-person-fill" },
        { id: "save", title: "Сохранить", icon: "bi-arrow-up-square" },
        { id: "add", title: "Добавить", icon: "bi-plus-lg" },
        { id: "edit", title: "Редактировать", icon: "bi-pencil" },
        { id: "remove", title: "Удалить", icon: "bi-trash" },
        // { id: "import", title: "Импортировать", icon: "bi-box-arrow-in-up" },
        { id: "export", title: "Экспортировать", icon: "bi-box-arrow-down" },
      ],
      oSelectedItem: null,
      sTableName: 'table'
    }
  },

  methods: {
    ...mapMutations(a`fnLoadRepos fnShowEditWindow fnRemoveFromTable`),
    ...mapActions(a`fnSaveToAllDatabase fnSaveDatabase fnExportDatabase fnImportDatabase`),
    fnFirst() {
        this.iPage = 1
    },
    fnPrevShift() {
        if (this.iPage>5) {
            this.iPage-=5
        }
    },
    fnPrev() {
        if (this.iPage>1) {
            this.iPage-=1
        }
    },
    fnLast() {
        this.iPage = this.iMaxPages
    },
    fnNextShift() {
        if (this.iPage<this.iMaxPages-5) {
            this.iPage+=5
        }
    },
    fnNext() {
        if (this.iPage<this.iMaxPages) {
            this.iPage+=1
        }
    },
    fnCopyToClipboard(sText) {
      navigator.clipboard.writeText(sText);
    },
    fnFilterInput(oE, sK) {
      this.$store.commit('fnUpdateFilter', { sTableName: this.sTableName, sName: sK, sV:oE.target.value })
    },
    fnClickLeftMenu(oItem) {
      if (oItem.id == "repo-window") {
        this.bShowRepoWindow = true
      }
      if (oItem.id == "save") {
        this.fnSaveAll()
      }
      if (oItem.id == "add") {
        this.fnAddClick()
      }
      if (oItem.id == "edit") {
        this.fnEditClick()
      }
      if (oItem.id == "remove") {
        this.fnRemoveClick()
      }
      if (oItem.id == "export") {
        this.fnExport()
      }
    },
    fnItemClick(oRow) {
      this.oSelectedItem = oRow
    },
    fnDblItemClick(oRow) {
      this.fnShowEditWindow({ sFormName: this.sTableName, oItem: this.oSelectedItem })
    },
    fnAddClick() {
        this.fnShowEditWindow({ sFormName: this.sTableName, oItem: {} })
    },
    fnEditClick() {
        if (this.oSelectedItem) {
            this.fnShowEditWindow({ sFormName: this.sTableName, oItem: this.oSelectedItem })
        } else {
            alert("Нужно выбрать")
        }
    },
    fnRemoveClick() {
        if (this.oSelectedItem) {
            this.fnRemoveFromTable({ sTableName: this.sTableName, oItem: this.oSelectedItem })
        } else {
            alert("Нужно выбрать")
        }
    },
    fnSaveAll() {
      // this.fnSaveDatabase()
      this.fnSaveToAllDatabase()
      this.bShowSaveToast = true
    },
    fnExport() {
      this.fnExportDatabase()
    },
    fnImport() {
      let oFile = this.$refs.file_selector.files[0];
      let reader = new FileReader();
      var oThis = this

      reader.readAsText(oFile);

      reader.onload = function() {
        oThis.fnImportDatabase(reader.result)
      };

      reader.onerror = function() {
        console.error(reader.error);
      };
    },
    fnFileImportChange() {
      this.fnImport()
    },
  },
  created() {
    var oThis = this;

    this.fnLoadRepos()

    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.keyCode === 83) {
          e.preventDefault();
          oThis.fnSaveAll()
      }
    });    
  }
}
</script>

<style>

</style>
