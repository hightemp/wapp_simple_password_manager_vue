(function(){var e={8842:function(e,t,o){"use strict";o(8674),o(7727);var a=o(9242),l=(o(3948),o(3396)),s=o(7139);const n={class:"wrapper"},i={class:"left-panel"},r=["onClick","title"],d={key:0,class:"badge"},c={class:"btn btn-import",title:"Импортировать"},m=(0,l._)("i",{class:"bi bi-box-arrow-in-up"},null,-1),p={class:"table-panel"},u={class:"table-actions-panel"},f=(0,l._)("div",{class:"spacer"},null,-1),b=(0,l._)("i",{class:"bi bi-chevron-bar-left"},null,-1),h=[b],w=(0,l._)("i",{class:"bi bi-chevron-double-left"},null,-1),v=[w],y=(0,l._)("i",{class:"bi bi-chevron-compact-left"},null,-1),g=[y],_={class:"input-group mb-3"},R={class:"input-group-text",id:"basic-addon1"},S=(0,l._)("i",{class:"bi bi-chevron-compact-right"},null,-1),k=[S],I=(0,l._)("i",{class:"bi bi-chevron-double-right"},null,-1),F=[I],D=(0,l._)("i",{class:"bi bi-chevron-bar-right"},null,-1),C=[D],x=(0,l._)("div",{class:"spacer"},null,-1),L={class:"table"},U=["onInput","value"],V=["onClick","onDblclick"],N=["href"],P=["onClick"],T=(0,l._)("i",{class:"bi bi-clipboard-check"},null,-1),W=[T];function E(e,t,o,b,w,y){const S=(0,l.up)("edit_window"),I=(0,l.up)("repo_window"),D=(0,l.up)("saved_toast"),T=(0,l.up)("loader");return(0,l.wg)(),(0,l.iD)(l.HY,null,[(0,l._)("div",n,[(0,l._)("div",i,[((0,l.wg)(!0),(0,l.iD)(l.HY,null,(0,l.Ko)(w.aMenu,((t,o)=>((0,l.wg)(),(0,l.iD)("button",{key:o,class:"btn btn-menu",onClick:e=>y.fnClickLeftMenu(t),title:t.title},[(0,l._)("i",{class:(0,s.C_)("bi "+t.icon)},null,2),"save"==t.id&&e.iUnsavedChanges?((0,l.wg)(),(0,l.iD)("span",d,(0,s.zw)(e.iUnsavedChanges),1)):(0,l.kq)("",!0)],8,r)))),128)),(0,l._)("button",c,[m,(0,l._)("label",null,[(0,l._)("input",{type:"file",ref:"file_selector",onChange:t[0]||(t[0]=(...e)=>y.fnFileImportChange&&y.fnFileImportChange(...e))},null,544)])])]),(0,l._)("div",p,[(0,l._)("div",u,[f,(0,l._)("button",{class:"btn btn-light",onClick:t[1]||(t[1]=(...e)=>y.fnFirst&&y.fnFirst(...e))},h),(0,l._)("button",{class:"btn btn-light",onClick:t[2]||(t[2]=(...e)=>y.fnPrevShift&&y.fnPrevShift(...e))},v),(0,l._)("button",{class:"btn btn-light",onClick:t[3]||(t[3]=(...e)=>y.fnPrev&&y.fnPrev(...e))},g),(0,l._)("div",_,[(0,l.wy)((0,l._)("input",{type:"text",class:"form-control","onUpdate:modelValue":t[4]||(t[4]=e=>y.iPage=e)},null,512),[[a.nr,y.iPage]]),(0,l._)("span",R,"/ "+(0,s.zw)(y.iMaxPages),1)]),(0,l._)("button",{class:"btn btn-light",onClick:t[5]||(t[5]=(...e)=>y.fnNext&&y.fnNext(...e))},k),(0,l._)("button",{class:"btn btn-light",onClick:t[6]||(t[6]=(...e)=>y.fnNextShift&&y.fnNextShift(...e))},F),(0,l._)("button",{class:"btn btn-light",onClick:t[7]||(t[7]=(...e)=>y.fnLast&&y.fnLast(...e))},C),x]),(0,l._)("div",L,[(0,l._)("div",{class:"table-row header",style:(0,s.j5)(y.sHeaderStyles)},[((0,l.wg)(!0),(0,l.iD)(l.HY,null,(0,l.Ko)(y.oStruct,((e,t)=>((0,l.wg)(),(0,l.iD)("div",{key:t,class:"cell header"},[(0,l.Uk)((0,s.zw)(e.label)+" ",1),(0,l._)("input",{type:"text",class:"form-control",onInput:e=>y.fnFilterInput(e,t),value:y.oTable.filter[t]},null,40,U)])))),128))],4),((0,l.wg)(!0),(0,l.iD)(l.HY,null,(0,l.Ko)(y.aSlicedRows,(e=>((0,l.wg)(),(0,l.iD)("div",{key:e,class:(0,s.C_)("table-row "+(w.oSelectedItem&&w.oSelectedItem.id==e.id?"active":"")),style:(0,s.j5)(y.sHeaderStyles),onClick:t=>y.fnItemClick(e),onDblclick:t=>y.fnDblItemClick(e)},[((0,l.wg)(!0),(0,l.iD)(l.HY,null,(0,l.Ko)(y.oStruct,((t,o)=>((0,l.wg)(),(0,l.iD)("div",{key:o,class:"cell"},[e[o]&&"url"==o?((0,l.wg)(),(0,l.iD)("a",{key:0,href:e[o]},(0,s.zw)(e[o]),9,N)):((0,l.wg)(),(0,l.iD)(l.HY,{key:1},[!e[o]||"password"!=o&&"login"!=o?(0,l.kq)("",!0):((0,l.wg)(),(0,l.iD)("button",{key:0,class:"btn btn-light copy-to-clipboard",onClick:t=>y.fnCopyToClipboard(e[o])},W,8,P)),(0,l.Uk)(" "+(0,s.zw)(e[o]),1)],64))])))),128))],46,V)))),128))])])]),(0,l.Wm)(S,{title:"Редактирование",form_name:w.sTableName,table_name:w.sTableName},null,8,["form_name","table_name"]),(0,l.Wm)(I),(0,l.Wm)(D),(0,l.Wm)(T)],64)}var O=o(5082),H=o(65);function z(e){return e[0].split(" ")}function q(e){return{[e]:{get(){return this.$store.state[e]},set(t){this.$store.commit("fnUpdateVar",{sName:e,sV:t})}}}}function A(e){var t={},o=e.split(" ");for(var a of o)t=Object.assign(t,q(a));return t}function Z(e,t){var o="data:text/json;charset=utf-8,"+encodeURIComponent(t),a=document.createElement("A");a.setAttribute("href",o),a.setAttribute("download",`${e}_${(new Date).getTime()}.json`),a.click(),a.remove()}const J={key:0},Y=(0,l._)("div",{class:"overlay"},null,-1),M={class:"modal show"},j={class:"modal-dialog"},G={class:"modal-content"},K={class:"modal-header"},$={class:"modal-title"},B={class:"modal-body"},Q={class:"modal-footer"};function X(e,t,o,a,n,i){const r=(0,l.up)("forms");return i.bShow?((0,l.wg)(),(0,l.iD)("div",J,[Y,(0,l._)("div",M,[(0,l._)("div",j,[(0,l._)("div",G,[(0,l._)("div",K,[(0,l._)("h5",$,(0,s.zw)(o.title),1),(0,l._)("button",{type:"button",class:"btn-close",onClick:t[0]||(t[0]=(...e)=>i.fnClose&&i.fnClose(...e))})]),(0,l._)("div",B,[(0,l.Wm)(r,{form_name:o.form_name},null,8,["form_name"])]),(0,l._)("div",Q,[(0,l._)("button",{type:"button",class:"btn btn-secondary",onClick:t[1]||(t[1]=(...e)=>i.fnClose&&i.fnClose(...e))},"Отмена"),(0,l._)("button",{type:"button",class:"btn btn-primary",onClick:t[2]||(t[2]=(...e)=>i.fnSave&&i.fnSave(...e))},"Сохранить")])])])])])):(0,l.kq)("",!0)}function ee(e,t,o,a,s,n){const i=(0,l.up)("form_component");return(0,l.wg)(!0),(0,l.iD)(l.HY,null,(0,l.Ko)(n.oItems,((e,t)=>((0,l.wg)(),(0,l.j4)(i,{key:e,item:e,onInput:e=>n.fnInput(e,t),value:n.fnGetFieldValue(this.form_name,t)},null,8,["item","onInput","value"])))),128)}const te={key:0,class:"mb-3"},oe={class:"form-label"},ae=["placeholder"],le={key:1,class:"mb-3"},se={class:"form-label"},ne=["placeholder"],ie={key:2,class:"mb-3"},re={class:"form-label"},de=["placeholder"],ce={key:3,class:"mb-3"},me={class:"form-label"},pe=["placeholder"],ue={key:4,class:"mb-3"},fe={class:"form-label"},be=["placeholder"],he={key:5,class:"mb-3"},we={class:"form-label"},ve=["placeholder"],ye={key:6,class:"mb-3"},ge={class:"form-label"},_e=(0,l._)("input",{type:"file",class:"form-control"},null,-1),Re={key:7,class:"mb-3"},Se={class:"form-label"},ke=["placeholder"],Ie={key:8,class:"mb-3"},Fe={class:"form-label"},De=["placeholder"],Ce={key:9,class:"mb-3"},xe={class:"form-label"},Le=["placeholder"],Ue={key:10,class:"mb-3"},Ve={class:"form-label"},Ne=["placeholder","min","max"],Pe={key:11,class:"mb-3"},Te={class:"form-label"},We=["placeholder"],Ee={key:12,class:"mb-3"},Oe={class:"form-label"},He=["placeholder"],ze={key:13,class:"mb-3"},qe={class:"form-label"},Ae=["placeholder"],Ze={key:14,class:"mb-3"},Je={class:"form-label"},Ye=["placeholder"],Me={key:15,class:"mb-3"},je={class:"form-label"},Ge=["placeholder"],Ke={key:16,class:"mb-3"},$e={class:"form-label"},Be=["value"],Qe={key:17,class:"mb-3"},Xe={class:"form-label"},et=["value"],tt={key:18,class:"mb-3"},ot={class:"form-label"},at=["value"];function lt(e,t,o,n,i,r){return(0,l.wg)(),(0,l.iD)(l.HY,null,["text"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",te,[(0,l._)("label",oe,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"text",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[0]||(t[0]=e=>r.mValue=e)},null,8,ae),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"textarea"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",le,[(0,l._)("label",se,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("textarea",{class:"form-control",rows:"10",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[1]||(t[1]=e=>r.mValue=e)},null,8,ne),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"email"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",ie,[(0,l._)("label",re,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"email",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[2]||(t[2]=e=>r.mValue=e)},null,8,de),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"color"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",ce,[(0,l._)("label",me,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"color",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[3]||(t[3]=e=>r.mValue=e)},null,8,pe),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"date"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",ue,[(0,l._)("label",fe,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"date",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[4]||(t[4]=e=>r.mValue=e)},null,8,be),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"datetime-local"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",he,[(0,l._)("label",we,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"datetime-local",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[5]||(t[5]=e=>r.mValue=e)},null,8,ve),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"file"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",ye,[(0,l._)("label",ge,(0,s.zw)(r.oItem.label),1),_e])):(0,l.kq)("",!0),"month"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Re,[(0,l._)("label",Se,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"month",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[6]||(t[6]=e=>r.mValue=e)},null,8,ke),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"number"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Ie,[(0,l._)("label",Fe,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"number",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[7]||(t[7]=e=>r.mValue=e)},null,8,De),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"password"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Ce,[(0,l._)("label",xe,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"password",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[8]||(t[8]=e=>r.mValue=e)},null,8,Le),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"range"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Ue,[(0,l._)("label",Ve,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"range",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[9]||(t[9]=e=>r.mValue=e),min:r.oItem.min,max:r.oItem.max},null,8,Ne),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"search"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Pe,[(0,l._)("label",Te,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"search",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[10]||(t[10]=e=>r.mValue=e)},null,8,We),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"tel"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Ee,[(0,l._)("label",Oe,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"tel",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[11]||(t[11]=e=>r.mValue=e)},null,8,He),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"time"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",ze,[(0,l._)("label",qe,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"time",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[12]||(t[12]=e=>r.mValue=e)},null,8,Ae),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"url"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Ze,[(0,l._)("label",Je,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"url",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[13]||(t[13]=e=>r.mValue=e)},null,8,Ye),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"week"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Me,[(0,l._)("label",je,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("input",{type:"week",class:"form-control",placeholder:r.oItem.placeholder,"onUpdate:modelValue":t[14]||(t[14]=e=>r.mValue=e)},null,8,Ge),[[a.nr,r.mValue]])])):(0,l.kq)("",!0),"checkbox_list"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Ke,[(0,l._)("label",$e,(0,s.zw)(r.oItem.label),1),((0,l.wg)(!0),(0,l.iD)(l.HY,null,(0,l.Ko)(r.oItem.items,(e=>((0,l.wg)(),(0,l.iD)("div",{key:e},[(0,l._)("label",null,[(0,l.wy)((0,l._)("input",{type:"checkbox","onUpdate:modelValue":t[15]||(t[15]=e=>r.mValue=e),value:e.value},null,8,Be),[[a.e8,r.mValue]]),(0,l.Uk)((0,s.zw)(e.label),1)])])))),128))])):(0,l.kq)("",!0),"radio_list"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",Qe,[(0,l._)("label",Xe,(0,s.zw)(r.oItem.label),1),((0,l.wg)(!0),(0,l.iD)(l.HY,null,(0,l.Ko)(r.oItem.items,(e=>((0,l.wg)(),(0,l.iD)("div",{key:e},[(0,l._)("label",null,[(0,l.wy)((0,l._)("input",{type:"radio","onUpdate:modelValue":t[16]||(t[16]=e=>r.mValue=e),value:e.value},null,8,et),[[a.G2,r.mValue]]),(0,l.Uk)((0,s.zw)(e.label),1)])])))),128))])):(0,l.kq)("",!0),"select"==r.oItem.type?((0,l.wg)(),(0,l.iD)("div",tt,[(0,l._)("label",ot,(0,s.zw)(r.oItem.label),1),(0,l.wy)((0,l._)("select",{class:"form-control","onUpdate:modelValue":t[17]||(t[17]=e=>r.mValue=e)},[((0,l.wg)(!0),(0,l.iD)(l.HY,null,(0,l.Ko)(r.oItem.items,(e=>((0,l.wg)(),(0,l.iD)("option",{key:e,value:e.value},(0,s.zw)(e.label),9,at)))),128))],512),[[a.bM,r.mValue]])])):(0,l.kq)("",!0)],64)}var st={props:["item","value"],emits:["input"],computed:{oItem(){return this.item},mValue:{get(){return this.value},set(e){this.$emit("input",e)}}}},nt=o(89);const it=(0,nt.Z)(st,[["render",lt]]);var rt=it,dt={props:["form_name"],components:{form_component:rt},computed:{oItems(){return this.$store.state.oStructure[this.form_name]}},methods:{fnGetFieldValue(e,t){return this.$store.getters.fnGetFieldValue(e,t)},fnInput(e,t){this.$store.commit("fnUpdateFormVar",{sFormName:this.form_name,sFieldName:t,mV:e})}}};const ct=(0,nt.Z)(dt,[["render",ee]]);var mt=ct;let pt,ut=e=>e;var ft={props:["title","form_name","table_name"],components:{forms:mt},computed:{bShow(){return this.$store.state.oEditWindow[this.form_name].window_show}},methods:(0,O.Z)((0,O.Z)({},(0,H.OI)(z(pt||(pt=ut`fnHideEditWindow fnEditWindowSave`)))),{},{fnClose(){this.fnHideEditWindow(this.form_name)},fnSave(){this.fnEditWindowSave({sTableName:this.table_name,sFormName:this.form_name}),this.fnHideEditWindow(this.form_name)}})};const bt=(0,nt.Z)(ft,[["render",X]]);var ht=bt;const wt=(0,l._)("div",{class:"block-overlay"},null,-1),vt={id:"modal-ask-api-key",class:"modal show",tabindex:"-1"},yt={class:"modal-dialog"},gt={class:"modal-content"},_t=(0,l._)("div",{class:"modal-header"},[(0,l._)("h5",{class:"modal-title"},"Данные репозитория")],-1),Rt={class:"modal-body",style:{height:"500px","overflow-y":"scroll"}},St={class:"modal-ask-api_list_buttons"},kt=(0,l._)("div",null,null,-1),It={class:"mb-3"},Ft=(0,l._)("label",{for:"",class:"form-label"},"Логин",-1),Dt=(0,l._)("option",{value:"github"},"github",-1),Ct=(0,l._)("option",{value:"webdav"},"webdav",-1),xt=[Dt,Ct],Lt={class:"mb-3"},Ut=(0,l._)("label",{for:"",class:"form-label"},"Название",-1),Vt={class:"mb-3"},Nt=(0,l._)("label",{for:"",class:"form-label"},"Логин",-1),Pt={class:"mb-3"},Tt=(0,l._)("label",{for:"",class:"form-label"},"Репозиторий",-1),Wt={class:"mb-3"},Et=(0,l._)("label",{for:"",class:"form-label"},"API Ключ",-1),Ot={class:"mb-3"},Ht=(0,l._)("label",{for:"",class:"form-label"},"URL",-1),zt={class:"mb-3"},qt=(0,l._)("label",{for:"",class:"form-label"},"Пользователь",-1),At={class:"mb-3"},Zt=(0,l._)("label",{for:"",class:"form-label"},"Пароль",-1),Jt={class:"modal-ask-api_list_buttons"},Yt={class:"actions"},Mt={class:"list-repo-item_desc"},jt={class:"list-repo-item_title"},Gt={class:"list-repo-item_type"},Kt={class:"list-repo-item_name"},$t=(0,l._)("b",null,"login:",-1),Bt=(0,l._)("b",null,"repo:",-1),Qt=(0,l._)("b",null,"key:",-1),Xt=(0,l._)("b",null,"url:",-1),eo=(0,l._)("b",null,"username:",-1),to=(0,l._)("b",null,"password:",-1),oo={class:"need-save"},ao=["onUpdate:modelValue"],lo={style:{display:"flex","align-items":"start"}},so=["onClick"],no=(0,l._)("i",{class:"bi bi-pencil"},null,-1),io=[no],ro=["onClick"],co=(0,l._)("i",{class:"bi bi-trash"},null,-1),mo=[co],po=["href"],uo=(0,l._)("i",{class:"bi bi-link"},null,-1),fo=[uo],bo=(0,l._)("div",{style:{width:"32px",height:"29px"}},null,-1),ho=(0,l._)("div",{style:{width:"32px",height:"29px"}},null,-1),wo=(0,l._)("div",{style:{width:"32px",height:"29px"}},null,-1),vo=["onClick"],yo=(0,l._)("i",{class:"bi bi-star-fill"},null,-1),go=[yo],_o={class:"modal-footer"};function Ro(e,t,o,n,i,r){return(0,l.wy)(((0,l.wg)(),(0,l.iD)("div",null,[wt,(0,l._)("div",vt,[(0,l._)("div",yt,[(0,l._)("div",gt,[_t,(0,l._)("div",Rt,[null!==i.iEditIndex?((0,l.wg)(),(0,l.iD)(l.HY,{key:0},[(0,l._)("div",St,[kt,(0,l._)("div",null,[(0,l._)("button",{type:"button",class:"btn btn-danger",onClick:t[0]||(t[0]=(...e)=>r.fnCancelRepo&&r.fnCancelRepo(...e))},"Отмена"),(0,l._)("button",{type:"button",class:"btn btn-primary",onClick:t[1]||(t[1]=(...e)=>r.fnSaveRepo&&r.fnSaveRepo(...e))},"Сохранить")])]),(0,l._)("div",It,[Ft,(0,l.wy)((0,l._)("select",{class:"form-control","onUpdate:modelValue":t[2]||(t[2]=e=>i.sFromType=e)},xt,512),[[a.bM,i.sFromType]])]),(0,l._)("div",Lt,[Ut,(0,l.wy)((0,l._)("input",{type:"text",class:"form-control","onUpdate:modelValue":t[3]||(t[3]=t=>e.sFormName=t)},null,512),[[a.nr,e.sFormName]])]),"github"==i.sFromType?((0,l.wg)(),(0,l.iD)(l.HY,{key:0},[(0,l._)("div",Vt,[Nt,(0,l.wy)((0,l._)("input",{type:"text",class:"form-control","onUpdate:modelValue":t[4]||(t[4]=e=>i.sFormLogin=e)},null,512),[[a.nr,i.sFormLogin]])]),(0,l._)("div",Pt,[Tt,(0,l.wy)((0,l._)("input",{type:"text",class:"form-control","onUpdate:modelValue":t[5]||(t[5]=e=>i.sFormRepo=e)},null,512),[[a.nr,i.sFormRepo]])]),(0,l._)("div",Wt,[Et,(0,l.wy)((0,l._)("input",{type:"text",class:"form-control","onUpdate:modelValue":t[6]||(t[6]=e=>i.sFormKey=e)},null,512),[[a.nr,i.sFormKey]])])],64)):(0,l.kq)("",!0),"webdav"==i.sFromType?((0,l.wg)(),(0,l.iD)(l.HY,{key:1},[(0,l._)("div",Ot,[Ht,(0,l.wy)((0,l._)("input",{type:"text",class:"form-control","onUpdate:modelValue":t[7]||(t[7]=e=>i.sFormURL=e)},null,512),[[a.nr,i.sFormURL]])]),(0,l._)("div",zt,[qt,(0,l.wy)((0,l._)("input",{type:"text",class:"form-control","onUpdate:modelValue":t[8]||(t[8]=t=>e.sFormUsername=t)},null,512),[[a.nr,e.sFormUsername]])]),(0,l._)("div",At,[Zt,(0,l.wy)((0,l._)("input",{type:"text",class:"form-control","onUpdate:modelValue":t[9]||(t[9]=t=>e.sFormPassword=t)},null,512),[[a.nr,e.sFormPassword]])])],64)):(0,l.kq)("",!0)],64)):((0,l.wg)(),(0,l.iD)(l.HY,{key:1},[(0,l._)("div",Jt,[(0,l._)("div",null,[(0,l.wy)((0,l._)("input",{type:"text",class:"form-control",placeholder:"Пароль от БД","onUpdate:modelValue":t[10]||(t[10]=t=>e.sPassword=t)},null,512),[[a.nr,e.sPassword]])]),(0,l._)("div",Yt,[(0,l._)("button",{class:"btn btn-secondary",onClick:t[11]||(t[11]=(...e)=>r.fnExport&&r.fnExport(...e))},"Экспортировать"),(0,l._)("button",{class:"btn btn-danger",onClick:t[12]||(t[12]=(...e)=>r.fnCleanRepo&&r.fnCleanRepo(...e))},"Очистить"),(0,l._)("button",{class:"btn btn-success",onClick:t[13]||(t[13]=(...e)=>r.fnNewRepo&&r.fnNewRepo(...e))},"Добавить")])]),((0,l.wg)(!0),(0,l.iD)(l.HY,null,(0,l.Ko)(e.aReposList,((t,o)=>((0,l.wg)(),(0,l.iD)("div",{key:o,class:(0,s.C_)("list-repo-item "+(e.iSelectedRepoIndex==o?"active":""))},[t?((0,l.wg)(),(0,l.iD)(l.HY,{key:0},[(0,l._)("div",Mt,[(0,l._)("div",jt,[(0,l._)("div",Gt,(0,s.zw)(t.type),1),(0,l._)("div",Kt,(0,s.zw)(t.name),1)]),"github"==t.type?((0,l.wg)(),(0,l.iD)(l.HY,{key:0},[(0,l._)("div",null,[$t,(0,l.Uk)(" "+(0,s.zw)(t.login),1)]),(0,l._)("div",null,[Bt,(0,l.Uk)(" "+(0,s.zw)(t.repo),1)]),(0,l._)("div",null,[Qt,(0,l.Uk)(" "+(0,s.zw)(t.key),1)])],64)):(0,l.kq)("",!0),"webdav"==t.type?((0,l.wg)(),(0,l.iD)(l.HY,{key:1},[(0,l._)("div",null,[Xt,(0,l.Uk)(" "+(0,s.zw)(t.url),1)]),(0,l._)("div",null,[eo,(0,l.Uk)(" "+(0,s.zw)(t.username),1)]),(0,l._)("div",null,[to,(0,l.Uk)(" "+(0,s.zw)(t.password),1)])],64)):(0,l.kq)("",!0),(0,l._)("div",oo,[(0,l._)("label",null,[(0,l.wy)((0,l._)("input",{type:"checkbox","onUpdate:modelValue":e=>t.need_save=e},null,8,ao),[[a.e8,t.need_save]]),(0,l.Uk)(" Нужно сохранять ")])])]),(0,l._)("div",lo,["localstorage"!=t.type?((0,l.wg)(),(0,l.iD)(l.HY,{key:0},[(0,l._)("button",{class:"btn btn-success",onClick:e=>r.fnEditRepo(o),title:"Редактировать"},io,8,so),(0,l._)("button",{class:"btn btn-danger",onClick:e=>r.fnRemoveRepo(o),title:"Удалить"},mo,8,ro),(0,l._)("a",{class:"btn btn-secondary",href:r.fnObjToURLParams(t)},fo,8,po)],64)):((0,l.wg)(),(0,l.iD)(l.HY,{key:1},[bo,ho,wo],64)),(0,l._)("button",{class:"btn btn-info",onClick:e=>r.fnSelectRepo(o),title:"Выбрать"},go,8,vo)])],64)):(0,l.kq)("",!0)],2)))),128))],64))]),(0,l._)("div",_o,[(0,l._)("button",{class:"btn btn-success",onClick:t[14]||(t[14]=e=>r.fnAcceptRepo())},"Выбрать")])])])])],512)),[[a.F8,e.bShowRepoWindow]])}o(1637),o(8862);let So,ko,Io,Fo,Do=e=>e;var Co={name:"AskAPIWindow",components:{},computed:(0,O.Z)((0,O.Z)((0,O.Z)({},(0,H.rn)(z(So||(So=Do`iSelectedRepoIndex bShowRepoWindow`)))),(0,H.Se)(z(ko||(ko=Do`aReposList`)))),A("sPassword")),data(){return{iEditIndex:null,sFormLogin:"",sFormRepo:"",sFormKey:"",sFormURL:"",sFromType:"github"}},methods:(0,O.Z)((0,O.Z)((0,O.Z)({},(0,H.OI)(z(Io||(Io=Do`fnReposRemove fnReposSelect fnReposClean fnReposUpdate`)))),(0,H.nv)(z(Fo||(Fo=Do`fnPrepareRepo`)))),{},{fnObjToURLParams(e){return"?"+new URLSearchParams(e).toString()},fnSaveRepo(){if(this.sFormName){var e={name:this.sFormName,login:this.sFormLogin,repo:this.sFormRepo,key:this.sFormKey,type:this.sFromType,url:this.sFormURL,username:this.sFormUsername,password:this.sFormPassword};this.fnReposUpdate({iIndex:this.iEditIndex,oObj:e}),this.iEditIndex=null}else alert("Надо заполнить поле - Название")},fnNewRepo(){this.iEditIndex=-1,this.sFormName="",this.sFormLogin="",this.sFormRepo="",this.sFormKey="",this.sFormType="github",this.sFormURL="",this.sFormUsername="",this.sFormPassword=""},fnEditRepo(e){this.iEditIndex=e;var t=this.aReposList[this.iEditIndex];this.sFormName=t.name,this.sFormLogin=t.login,this.sFormRepo=t.repo,this.sFormKey=t.key,this.sFormType=t.type,this.sFormURL=t.url,this.sFormUsername=t.username,this.sFormPassword=t.password},fnRemoveRepo(e){this.fnReposRemove(e)},fnSelectRepo(e){this.fnReposSelect(e)},fnCleanRepo(){this.fnReposClean()},fnCancelRepo(){this.iEditIndex=null},fnAcceptRepo(){if(!this.aReposList[this.iSelectedRepoIndex])return alert("Нужно выбрать репозиторий");this.fnPrepareRepo()},fnExport(){Z("database",JSON.stringify(this.aReposList))}}),created(){}};const xo=(0,nt.Z)(Co,[["render",Ro]]);var Lo=xo;const Uo={class:"toast-container position-fixed top-0 end-0 p-3"},Vo={key:0,class:"toast fade show",role:"alert","aria-live":"assertive","aria-atomic":"true"},No=(0,l._)("div",{class:"toast-header"},[(0,l._)("strong",{class:"me-auto"},"Сохранено"),(0,l._)("button",{type:"button",class:"btn-close","data-bs-dismiss":"toast","aria-label":"Close"})],-1),Po=(0,l._)("div",{class:"toast-body"}," Данные были сохранены ",-1),To=[No,Po];function Wo(e,t,o,a,s,n){return(0,l.wg)(),(0,l.iD)("div",Uo,[e.bShowSaveToast?((0,l.wg)(),(0,l.iD)("div",Vo,To)):(0,l.kq)("",!0)])}var Eo={name:"SavedToast",components:{},computed:(0,O.Z)({},A("bShowSaveToast")),data(){return{}},watch:{bShowSaveToast(e,t){e&&setTimeout((()=>{this.bShowSaveToast=!1}),2e3)}}};const Oo=(0,nt.Z)(Eo,[["render",Wo]]);var Ho=Oo;const zo={class:"loader"},qo=(0,l._)("div",{class:"center"},[(0,l._)("div",{class:"lds-dual-ring"})],-1),Ao=[qo];function Zo(e,t,o,s,n,i){return(0,l.wy)(((0,l.wg)(),(0,l.iD)("div",zo,Ao,512)),[[a.F8,e.bShowLoader]])}let Jo,Yo=e=>e;var Mo={computed:(0,O.Z)({},(0,H.rn)(z(Jo||(Jo=Yo`bShowLoader`))))};const jo=(0,nt.Z)(Mo,[["render",Zo]]);var Go=jo;let Ko,$o,Bo,Qo,Xo=e=>e;var ea={name:"App",components:{edit_window:ht,repo_window:Lo,saved_toast:Ho,loader:Go},computed:(0,O.Z)((0,O.Z)((0,O.Z)((0,O.Z)({},A("bShowRepoWindow bShowSaveToast sPassword")),(0,H.Se)(z(Ko||(Ko=Xo`aReposList`)))),(0,H.rn)(z($o||($o=Xo`iUnsavedChanges`)))),{},{sHeaderStyles(){return{display:"grid","grid-template-columns":"1fr ".repeat(this.iStructLength)}},iStructLength(){return Object.keys(this.oStruct).length},oStruct(){return this.$store.state.oStructure["table"]},oTable(){return this.$store.state.oDatabase["table"]},iMaxPages(){return Math.ceil(this.aRows.length/this.iPageCount)},iPage:{get(){var e;return null!==(e=this.$store.state.oDatabase["table"].page)&&void 0!==e?e:1},set(e){this.$store.state.oDatabase["table"].page=1*e}},iPageCount(){return Math.floor((window.innerHeight-60-30)/27)},aRows(){var e=this.oTable.data.filter((e=>{var t=!0;for(var o in this.oTable.filter)console.log(this.oTable.filter[o]),this.oTable.filter[o]&&(console.log(this.oTable.filter[o]),t=t&&~e[o].indexOf(this.oTable.filter[o]));return t}));return e},aSlicedRows(){var e=this.aRows.slice((this.iPage-1)*this.iPageCount,this.iPage*this.iPageCount);return e}}),data(){return{aMenu:[{id:"repo-window",title:"Выбрать репозиторий",icon:"bi-person-fill"},{id:"save",title:"Сохранить",icon:"bi-arrow-up-square"},{id:"add",title:"Добавить",icon:"bi-plus-lg"},{id:"edit",title:"Редактировать",icon:"bi-pencil"},{id:"remove",title:"Удалить",icon:"bi-trash"},{id:"export",title:"Экспортировать",icon:"bi-box-arrow-down"}],oSelectedItem:null,sTableName:"table"}},methods:(0,O.Z)((0,O.Z)((0,O.Z)({},(0,H.OI)(z(Bo||(Bo=Xo`fnLoadRepos fnShowEditWindow fnRemoveFromTable`)))),(0,H.nv)(z(Qo||(Qo=Xo`fnSaveToAllDatabase fnSaveDatabase fnExportDatabase fnImportDatabase`)))),{},{fnFirst(){this.iPage=1},fnPrevShift(){this.iPage>5&&(this.iPage-=5)},fnPrev(){this.iPage>1&&(this.iPage-=1)},fnLast(){this.iPage=this.iMaxPages},fnNextShift(){this.iPage<this.iMaxPages-5&&(this.iPage+=5)},fnNext(){this.iPage<this.iMaxPages&&(this.iPage+=1)},fnCopyToClipboard(e){navigator.clipboard.writeText(e)},fnFilterInput(e,t){this.$store.commit("fnUpdateFilter",{sTableName:this.sTableName,sName:t,sV:e.target.value})},fnClickLeftMenu(e){"repo-window"==e.id&&(this.bShowRepoWindow=!0),"save"==e.id&&this.fnSaveAll(),"add"==e.id&&this.fnAddClick(),"edit"==e.id&&this.fnEditClick(),"remove"==e.id&&this.fnRemoveClick(),"export"==e.id&&this.fnExport()},fnItemClick(e){this.oSelectedItem=e},fnDblItemClick(e){this.fnShowEditWindow({sFormName:this.sTableName,oItem:this.oSelectedItem})},fnAddClick(){this.fnShowEditWindow({sFormName:this.sTableName,oItem:{}})},fnEditClick(){this.oSelectedItem?this.fnShowEditWindow({sFormName:this.sTableName,oItem:this.oSelectedItem}):alert("Нужно выбрать")},fnRemoveClick(){this.oSelectedItem?this.fnRemoveFromTable({sTableName:this.sTableName,oItem:this.oSelectedItem}):alert("Нужно выбрать")},fnSaveAll(){this.fnSaveToAllDatabase(),this.bShowSaveToast=!0},fnExport(){this.fnExportDatabase()},fnImport(){let e=this.$refs.file_selector.files[0],t=new FileReader;var o=this;t.readAsText(e),t.onload=function(){o.fnImportDatabase(t.result)},t.onerror=function(){console.error(t.error)}},fnFileImportChange(){this.fnImport()}}),created(){var e=this;this.fnLoadRepos(),document.addEventListener("keydown",(t=>{t.ctrlKey&&83===t.keyCode&&(t.preventDefault(),e.fnSaveAll())}))}};const ta=(0,nt.Z)(ea,[["render",E]]);var oa=ta,aa=(o(7658),o(285),o(4916),o(7327)),la=(o(5306),o(3138)),sa=o(8228),na=o(6704),ia=o(8082),ra=o(2898);class da{constructor(e){(0,aa.Z)(this,"octokit",null),(0,aa.Z)(this,"oSHA",{}),(0,aa.Z)(this,"webdav",null),(0,aa.Z)(this,"oRepoItem",null),this.fnInit(e)}fnInit(e){this.oRepoItem=e,"github"==e.type&&this.fnInitGit(),"webdav"==e.type&&this.fnInitWebdav(),e.type}fnInitGit(){this.octokit=new la.v({auth:this.oRepoItem.key})}fnInitWebdav(){this.webdav=(0,sa.createClient)(this.oRepoItem.url,{username:this.oRepoItem.username,password:this.oRepoItem.password})}fnReadFileJSON(e){return new Promise(((t,o)=>{this.fnReadFile(e).then((({sData:e})=>{t(JSON.parse(e))})).catch((e=>{o(e)}))}))}fnReadFileCryptoJSON(e,t){return new Promise(((o,a)=>{this.fnReadFile(e).then((({sData:e})=>{e||a("Not Found"),o(JSON.parse(ra.decrypt(e,t).toString(ia.enc.Utf8)))})).catch((e=>{a(e)}))}))}fnReadFile(e){return"localstorage"==this.oRepoItem.type?this.fnReadFileLocalStorage(e):"github"==this.oRepoItem.type?this.fnReadFileGithub(e):"webdav"==this.oRepoItem.type?this.fnReadFileWebdav(e):void 0}fnWriteFileJSON(e,t){return this.fnWriteFile(e,JSON.stringify(t,null,4))}fnWriteFileCryptoJSON(e,t,o){return this.fnWriteFile(e,ra.encrypt(JSON.stringify(t,null,4),o).toString())}fnWriteFile(e,t){return"localstorage"==this.oRepoItem.type?this.fnWriteFileLocalStorage(e,t):"github"==this.oRepoItem.type?this.fnWriteFileGithub(e,t):"webdav"==this.oRepoItem.type?this.fnWriteFileWebdav(e,t):void 0}fnCreateDir(e){if("webdav"==this.oRepoItem.type)return this.fnCreateDirWebdav(e)}fnCreateDirWebdav(e){return new Promise(((t,o)=>{_l(">>>",e),this.webdav.createDirectory(e),t()}))}fnReadFileLocalStorage(e){return new Promise((async function(t,o){var a=localStorage.getItem(e);t({sData:a,sSHA:""})}))}fnReadFileWebdav(e){var t=this;this.oRepoItem;return new Promise((async function(o,a){try{var l=await t.webdav.getFileContents(e),s=new TextDecoder("utf-8"),n=s.decode(l);t.oSHA[e]="",o({sData:n,sSHA:""})}catch(i){console.error(i),a(i)}}))}fnReadFileGithub(e){var t=this;return new Promise((async function(o,a){var l=t.oRepoItem;return console.log("read",l),e=e.replace(/^\/+/,""),t.octokit.rest.repos.getContent({owner:l.login,repo:l.repo,path:e}).then((({data:a})=>{var l=(0,na.Jx)(a.content);t.oSHA[e]=a.sha,console.log(t.oSHA),o({sData:l,sSHA:a.sha})})).catch((e=>{console.error(e),a(e)}))}))}fnWriteFileLocalStorage(e,t){return new Promise((async function(o,a){localStorage.setItem(e,t),o()}))}fnWriteFileGithub(e,t,o=null){var a=this;return new Promise((async function(l,s){var n=a.oRepoItem;return console.log("write",n),e=e.replace(/^\/+/,""),a.octokit.rest.repos.createOrUpdateFileContents({owner:n.login,repo:n.repo,path:e,sha:o||a.oSHA[e],message:a.fnGetUpdateMessage(),content:(0,na.cv)(t)}).then((()=>{l()})).catch((e=>{console.error(e),s(e)}))}))}fnWriteFileWebdav(e,t){var o=this;return new Promise((async function(a,l){o.oRepoItem;return new Promise((async function(a,l){try{var s=new TextEncoder,n=s.encode(t);await o.webdav.putFileContents(e,n,{contentLength:!1,overwrite:!0}),a()}catch(i){l(i)}}))}))}fnGetUpdateMessage(){return"update: "+new Date}}const ca="passwords-database";var ma=(0,H.MT)({state(){return{bShowRepoWindow:!0,aDefaultRepoList:[{type:"localstorage",name:"Локальное хранилище"}],aReposList:[],oReposFileSystem:{},iSelectedRepoIndex:null,bShowLoader:!1,bShowSaveToast:!1,sPassword:"",oStructure:{table:{category:{label:"Категория",type:"text"},name:{label:"Название",type:"text"},login:{label:"Логин",type:"text"},password:{label:"Пароль",type:"text"},url:{label:"URL",type:"text"},description:{label:"Описание",type:"textarea"}}},oDatabase:{table:{last_index:0,page:1,data:[],selection_id:null,filter:{category:"",name:"",login:"",password:"",url:"",description:""}}},oEditWindow:{table:{window_show:!1,edit_item:{}}},oForms:{table:{category:"",name:"",login:"",password:"",url:"",description:""}},iUnsavedChanges:0,sMode:"tasks"}},mutations:{fnUpdateFormVar(e,{sFormName:t,sFieldName:o,mV:a}){e.oForms[t][o]=a},fnUpdateDatabaseVar(e,{sTableName:t,sVarName:o,mV:a}){e.oDatabase[t][o]=a},fnUpdateVar(e,{sName:t,sV:o}){e[t]=o},fnUpdateFilter(e,{sTableName:t,sName:o,sV:a}){e.oDatabase[t].filter[o]=a},fnReposRemove(e,t){e.aReposList.splice(t-e.aDefaultRepoList.length,1),localStorage.setItem("aReposList",JSON.stringify(e.aReposList))},fnReposSelect(e,t){e.iSelectedRepoIndex=t;var o=e.aDefaultRepoList.concat(e.aReposList);for(var a of o)a.need_save=!1;o[0].need_save=!0,o[e.iSelectedRepoIndex].need_save=!0},fnReposClean(e){e.aReposList=[],localStorage.setItem("aReposList",JSON.stringify(e.aReposList))},fnReposUpdate(e,{iIndex:t,oObj:o}){-1==t?e.aReposList.push(o):e.aReposList.splice(t-e.aDefaultRepoList.length,1,o),localStorage.setItem("aReposList",JSON.stringify(e.aReposList))},fnLoadRepos(e){try{e.aReposList=JSON.parse(localStorage.getItem("aReposList")||"[]");const l=new URL(window.location),{searchParams:s}=l;if(s.get("type")){var t={type:s.get("type"),name:s.get("name"),login:s.get("login"),repo:s.get("repo"),key:s.get("key"),url:s.get("url"),username:s.get("username"),password:s.get("password")},o=e.aReposList.find((e=>e.name==t.name));if(o){for(var a in t)o[a]=t[a];localStorage.setItem("aReposList",JSON.stringify(e.aReposList))}else e.aReposList.push(t),localStorage.setItem("aReposList",JSON.stringify(e.aReposList))}}catch(ut){}},fnUpdateDatabase(e,t){e.oDatabase=t},fnHideRepoWindow(e){e.bShowRepoWindow=!1},fnShowRepoWindow(e){e.bShowRepoWindow=!0},fnShowLoader(e){e.bShowLoader=!0},fnHideLoader(e){e.bShowLoader=!1},fnHideEditWindow(e,t){e.oEditWindow[t].window_show=!1},fnShowEditWindow(e,{sFormName:t,oItem:o}){for(var a in e.oEditWindow[t].window_show=!0,e.oEditWindow[t].edit_item=o,e.oForms[t])e.oForms[t][a]=a in o?o[a]:""},fnEditWindowSave(e,{sTableName:t,sFormName:o}){for(var a in e.oForms[o])e.oEditWindow[o].edit_item[a]=e.oForms[o][a];e.oEditWindow[o].edit_item.id||(e.oEditWindow[o].edit_item.id=++e.oDatabase[t]["last_index"],e.oDatabase[t]["data"].push(e.oEditWindow[o].edit_item)),e.iUnsavedChanges++},fnRemoveFromTable(e,{sTableName:t,oItem:o}){e.oDatabase[t]["data"]=e.oDatabase[t]["data"].filter((e=>e.id!=o.id)),e.iUnsavedChanges++},fnCreateFileSystem(e,{iIndex:t}){var o=e.aDefaultRepoList.concat(e.aReposList);console.log(o[t]),e.oReposFileSystem[t]=new da(o[t])},fnSetNeedSaveToCurrentRepo(e){var t=e.aDefaultRepoList.concat(e.aReposList);t[e.iSelectedRepoIndex].need_save=!0,console.log(t[e.iSelectedRepoIndex])}},actions:{fnExportDatabase({commit:e,state:t,dispatch:o,getters:a}){Z("passwords-database",JSON.stringify(t.oDatabase,null,4))},fnImportDatabase({commit:e,state:t,dispatch:o,getters:a},l){e("fnUpdateDatabase",JSON.parse(l))},fnPrepareRepo({commit:e,state:t,dispatch:o,getters:a}){e("fnHideRepoWindow"),e("fnCreateFileSystem",{iIndex:t.iSelectedRepoIndex}),e("fnSetNeedSaveToCurrentRepo"),o("fnLoadDatabase")},fnSaveToAllDatabase({commit:e,state:t,getters:o,dispatch:a}){for(var l in o.aReposList){var s=o.aReposList[l];s.need_save&&(t.oReposFileSystem[l]||e("fnCreateFileSystem",{iIndex:l}),a("fnSaveDatabase",{oFileSystem:t.oReposFileSystem[l]}))}},fnSaveCurrentDatabase({commit:e,state:t,getters:o,dispatch:a}){a("fnSaveDatabase",{oFileSystem:o.oCurrentFileSystem})},fnSaveDatabase({commit:e,state:t},{oFileSystem:o}){return o.fnWriteFileCryptoJSON(ca,t.oDatabase,t.sPassword).then((()=>{t.iUnsavedChanges=0})).catch((()=>{o.fnReadFile(ca).then((()=>o.fnWriteFileCryptoJSON(ca,t.oDatabase,t.sPassword).then((()=>{t.iUnsavedChanges=0}))))}))},fnLoadDatabase({commit:e,state:t,getters:o}){e("fnShowLoader"),o.oCurrentFileSystem.fnReadFileCryptoJSON(ca,t.sPassword).then((t=>{if(!t)throw"Cannot destructure property";e("fnUpdateDatabase",t),e("fnHideLoader")})).catch((a=>{if(console.error(a),(a+"").match(/Malformed UTF-8 data/))return alert("Не правильный пароль"),void e("fnShowRepoWindow");(a+"").match(/Cannot destructure property/)||(a+"").match(/Not Found/)?o.oCurrentFileSystem.fnWriteFileCryptoJSON(ca,t.oDatabase,t.sPassword).then((()=>{o.oCurrentFileSystem.fnReadFileCryptoJSON(ca,t.sPassword).then((t=>{e("fnUpdateDatabase",t),e("fnHideLoader")}))})):e("fnShowRepoWindow")}))},fnDropDatabase({commit:e,state:t}){localStorage.setItem(ca,null)},fnGetFieldValue:({state:e,getters:t})=>(e,o)=>t.fnGetFieldValue(e,o)},getters:{fnGetFieldValue:e=>(t,o)=>e.oForms[t][o],aReposList(e){return e.aDefaultRepoList.concat(e.aReposList)},oCurrentRepo(e,t){return t.aReposList[e.iSelectedRepoIndex]},oCurrentFileSystem(e,t){return e.oReposFileSystem[e.iSelectedRepoIndex]},fnFilterGroups:e=>t=>e.oDatabase.tasks_groups.filter((e=>~e.name.indexOf(t)))}}),pa=o(5431);(0,pa.z)("service-worker.js",{ready(){console.log("App is being served from cache by a service worker.\nFor more details, visit https://goo.gl/AFskqB")},registered(){console.log("Service worker has been registered.")},cached(){console.log("Content has been cached for offline use.")},updatefound(){console.log("New content is downloading.")},updated(){console.log("New content is available; please refresh.")},offline(){console.log("No internet connection found. App is running in offline mode.")},error(e){console.error("Error during service worker registration:",e)}}),(0,a.ri)(oa).use(ma).mount("#app")},2480:function(){}},t={};function o(a){var l=t[a];if(void 0!==l)return l.exports;var s=t[a]={exports:{}};return e[a].call(s.exports,s,s.exports,o),s.exports}o.m=e,function(){var e=[];o.O=function(t,a,l,s){if(!a){var n=1/0;for(c=0;c<e.length;c++){a=e[c][0],l=e[c][1],s=e[c][2];for(var i=!0,r=0;r<a.length;r++)(!1&s||n>=s)&&Object.keys(o.O).every((function(e){return o.O[e](a[r])}))?a.splice(r--,1):(i=!1,s<n&&(n=s));if(i){e.splice(c--,1);var d=l();void 0!==d&&(t=d)}}return t}s=s||0;for(var c=e.length;c>0&&e[c-1][2]>s;c--)e[c]=e[c-1];e[c]=[a,l,s]}}(),function(){o.n=function(e){var t=e&&e.__esModule?function(){return e["default"]}:function(){return e};return o.d(t,{a:t}),t}}(),function(){o.d=function(e,t){for(var a in t)o.o(t,a)&&!o.o(e,a)&&Object.defineProperty(e,a,{enumerable:!0,get:t[a]})}}(),function(){o.g=function(){if("object"===typeof globalThis)return globalThis;try{return this||new Function("return this")()}catch(e){if("object"===typeof window)return window}}()}(),function(){o.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)}}(),function(){var e={143:0};o.O.j=function(t){return 0===e[t]};var t=function(t,a){var l,s,n=a[0],i=a[1],r=a[2],d=0;if(n.some((function(t){return 0!==e[t]}))){for(l in i)o.o(i,l)&&(o.m[l]=i[l]);if(r)var c=r(o)}for(t&&t(a);d<n.length;d++)s=n[d],o.o(e,s)&&e[s]&&e[s][0](),e[s]=0;return o.O(c)},a=self["webpackChunkwapp_simple_password_manager_vue"]=self["webpackChunkwapp_simple_password_manager_vue"]||[];a.forEach(t.bind(null,0)),a.push=t.bind(null,a.push.bind(a))}();var a=o.O(void 0,[998],(function(){return o(8842)}));a=o.O(a)})();
//# sourceMappingURL=app.48159d21.js.map