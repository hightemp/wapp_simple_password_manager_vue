<template>
  <div class="wrapper">
    <div class="left-panel">
      <button v-for="(oMenuItem, iI) in aMenu" :key="iI" class="btn btn-menu" @click="fnClickLeftMenu(oMenuItem)" :title="oMenuItem.title">
        <i :class="'bi '+oMenuItem.icon"></i>
        <template v-if="oMenuItem.id=='save' && iUnsavedChanges">
          <span class="badge">{{iUnsavedChanges}}</span>
        </template>
      </button>
      <button class="btn btn-import" title="Импортировать"><i class="bi bi-box-arrow-in-up"></i><label><input type="file" ref="file_selector" @change="fnFileImportChange" /></label></button>
    </div>
    <div class="table-panel">
      <div class="table">
          <div class="table-row header" :style="sHeaderStyles">
              <div v-for="(oSF, sK) in oStruct" :key="sK" class="cell header">
                  {{oSF.label}}
                  <input type="text" class="form-control" @input="(oE) => fnFilterInput(oE, sK)" :value="oTable.filter[sK]"  />
              </div>
          </div>
          <!-- {{aRows}} -->
          <template v-for="oRow in aRows" :key="oRow">
              <div 
                  :class="'table-row '+(oSelectedItem && oSelectedItem.id == oRow.id ? 'active' : '')" 
                  :style="sHeaderStyles" 
                  @click="(oE) => fnItemClick(oRow)"
              >
                  <div v-for="(oSF, sK) in oStruct" :key="sK" class="cell">
                    <template v-if="oRow[sK] && sK=='url'">
                      <a :href="oRow[sK]">{{oRow[sK]}}</a>
                    </template>
                    <template v-else>
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
        var aRows = this.aRows.slice((this.sPage-1)*this.iPageCount, this.sPage*this.iPageCount)
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
    ...mapActions(a`fnSaveDatabase fnExportDatabase fnImportDatabase`),
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
      this.fnSaveDatabase()
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
