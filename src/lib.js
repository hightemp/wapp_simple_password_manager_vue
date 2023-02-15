export function fnCapitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function a(s) {
    return s[0].split(' ')
}

export function c(sName) {
    return { [sName]:{
        get() { return this.$store.state[sName] },
        set(sV) { this.$store.commit(`fnUpdateVar`, { sName, sV } ) }
    } }
} 

export function cc(sList) {
    var oO = {}
    var aL = sList.split(' ')
    for (var sI of aL) {
        oO = Object.assign(oO, c(sI))
    }
    return oO
}

export function co(sName, sTableName, sField) {
    return { [sName]: {
        get() { return this.$store.getters[sName] },
        set(sV) { this.$store.commit(`fnUpdateDatabase`, { sTableName, sField, sV }) }
    } }
}

export function fnRandomString() {
    return (Math.random() + 1).toString(36).substring(7);
}

export function fnSaveFile(sFileName, sData) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(sData);
    var oE = document.createElement("A");
    oE.setAttribute("href", dataStr);
    oE.setAttribute("download", `${sFileName}_${(new Date).getTime()}.json`);
    oE.click();
    oE.remove()
}