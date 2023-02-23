import { Octokit } from "@octokit/rest"
import { createClient } from "webdav/web"
import { encode, decode } from 'js-base64'
var CryptoJS = require("crypto-js");
var DES = require("crypto-js/tripledes");

export class FileSystemDriver {
    /** @var Octokit octokit */
    octokit = null
    oSHA = {}

    /** @var WebDAVClient webdav */
    webdav = null

    oRepoItem = null

    // ===============================================================
    
    constructor (oRepoItem) {
        this.fnInit(oRepoItem)
    }

    fnInit(oRepoItem)
    {
        this.oRepoItem = oRepoItem

        if (oRepoItem.type == "github") {
            this.fnInitGit()
        }
        if (oRepoItem.type == "webdav") {
            this.fnInitWebdav()
        }
        if (oRepoItem.type == "localstorage") {
        }
    }

    fnInitGit()
    {
        this.octokit = new Octokit({
            auth: this.oRepoItem.key,
        });
    }

    fnInitWebdav()
    {
        this.webdav = createClient(
            this.oRepoItem.url,
            {
                username: this.oRepoItem.username,
                password: this.oRepoItem.password
            }
        );
    }

    // ===============================================================
    
    fnReadFileJSON(sFilePath)
    {
        return new Promise((fnResolv, fnReject) => {
            this.fnReadFile(sFilePath)
                .then(({ sData }) => {
                    fnResolv(JSON.parse(sData))
                })
                .catch((oE) => { fnReject(oE) })
        })
    }

    fnReadFileCryptoJSON(sFilePath, sKey)
    {
        return new Promise((fnResolv, fnReject) => {
            this.fnReadFile(sFilePath)
                .then(({ sData }) => {
                    if (!sData) fnReject("Not Found")
                    fnResolv(JSON.parse(DES.decrypt(sData, sKey).toString(CryptoJS.enc.Utf8)))
                })
                .catch((oE) => { fnReject(oE) })
        })
    }

    fnReadFile(sFilePath)
    {
        if (this.oRepoItem.type == "localstorage") {
            return this.fnReadFileLocalStorage(sFilePath)
        }
        if (this.oRepoItem.type == "github") {
            return this.fnReadFileGithub(sFilePath)
        }
        if (this.oRepoItem.type == "webdav") {
            return this.fnReadFileWebdav(sFilePath)
        }
    }

    fnWriteFileJSON(sFilePath, mData)
    {
        return this.fnWriteFile(sFilePath, JSON.stringify(mData, null, 4))
    }

    fnWriteFileCryptoJSON(sFilePath, mData, sKey)
    {
        return this.fnWriteFile(sFilePath, DES.encrypt(JSON.stringify(mData, null, 4), sKey).toString())
    }

    fnWriteFile(sFilePath, sData)
    {
        if (this.oRepoItem.type == "localstorage") {
            return this.fnWriteFileLocalStorage(sFilePath, sData)
        }
        if (this.oRepoItem.type == "github") {
            return this.fnWriteFileGithub(sFilePath, sData)
        }
        if (this.oRepoItem.type == "webdav") {
            return this.fnWriteFileWebdav(sFilePath, sData)
        }
    }

    fnCreateDir(sFilePath)
    {
        if (this.oRepoItem.type == "webdav") {
            return this.fnCreateDirWebdav(sFilePath)
        }
    }

    // ===============================================================

    fnCreateDirWebdav(sFilePath)
    {
        return new Promise((fnResolv, fnReject) => {
            _l(">>>", sFilePath)
            this.webdav.createDirectory(sFilePath)
            fnResolv();
        })
    }

    fnReadFileLocalStorage(sFilePath)
    {
        return new Promise(async (fnResolv, fnReject) => {
            var sData = localStorage.getItem(sFilePath);
            fnResolv({ sData, sSHA: "" })
        })
    }

    fnReadFileWebdav(sFilePath)
    {
        var oR = this.oRepoItem

        return new Promise(async (fnResolv, fnReject) => {
            try {
                var oData = (await this.webdav.getFileContents(sFilePath))
                var enc = new TextDecoder("utf-8");
                var sData = enc.decode(oData)
                this.oSHA[sFilePath] = ""
                fnResolv({ sData, sSHA:"" })
            } catch (oE) {
                console.error(oE)
                fnReject(oE)
            }
        })
    }

    fnReadFileGithub(sFilePath)
    {
        return new Promise(async (fnResolv, fnReject) => {
            var oR = this.oRepoItem
            console.log('read', oR)
            sFilePath = sFilePath.replace(/^\/+/, '')
            return this.octokit.rest.repos.getContent({
                owner: oR.login,
                repo: oR.repo,
                path: sFilePath,
            }).then(({ data }) => {
                var sData = decode(data.content)
                this.oSHA[sFilePath] = data.sha
                console.log(this.oSHA)
                fnResolv({sData, sSHA: data.sha})
            }).catch((oE) => {
                console.error(oE)
                fnReject(oE)
            })
        })
    }

    fnWriteFileLocalStorage(sFilePath, sData)
    {
        return new Promise(async (fnResolv, fnReject) => {
            localStorage.setItem(sFilePath, sData)
            fnResolv()
        })
    }

    fnWriteFileGithub(sFilePath, sData, sSHA=null)
    {
        return new Promise(async (fnResolv, fnReject) => {
            var oR = this.oRepoItem
            console.log('write', oR)
            sFilePath = sFilePath.replace(/^\/+/, '')
            return this.octokit.rest.repos.createOrUpdateFileContents({
                owner: oR.login,
                repo: oR.repo,
                path: sFilePath,
                sha: sSHA ? sSHA : this.oSHA[sFilePath],
                message: this.fnGetUpdateMessage(),
                content: encode(sData)
            })
            .then(() => {
                fnResolv()
            })
            .catch((oE) => {
                console.error(oE)
                fnReject(oE)
            })
        })
    }

    fnWriteFileWebdav(sFilePath, sData)
    {
        return new Promise(async (fnResolv, fnReject) => {
            var oR = this.oRepoItem

            return new Promise(async (fnResolv, fnReject) => {
                try {
                    var enc = new TextEncoder()
                    var aData = enc.encode(sData)
                    await this.webdav.putFileContents(
                        sFilePath, 
                        aData,
                        { contentLength: false, overwrite: true }
                    )

                    fnResolv()
                } catch (oE) {
                    fnReject(oE)
                }
            })
        })
    }

    fnGetUpdateMessage() {
        return "update: "+(new Date())
    }
}