import { Octokit } from "@octokit/rest"
import { createClient } from "webdav/web"
import { encode, decode } from 'js-base64'
var CryptoJS = require("crypto-js");
var DES = require("crypto-js/tripledes");

export class FileSystemDriver {
    /** @var Octokit octokit */
    static octokit = null
    static oSHA = {}

    /** @var WebDAVClient webdav */
    static webdav = null

    static oRepoItem = null

    // ===============================================================

    static fnInit(oRepoItem)
    {
        FileSystemDriver.oRepoItem = oRepoItem

        if (oRepoItem.type == "github") {
            FileSystemDriver.fnInitGit()
        }
        if (oRepoItem.type == "webdav") {
            FileSystemDriver.fnInitWebdav()
        }
        if (oRepoItem.type == "localstorage") {
        }
    }

    static fnInitGit()
    {
        FileSystemDriver.octokit = new Octokit({
            auth: FileSystemDriver.oRepoItem.key,
        });
    }

    static fnInitWebdav()
    {
        FileSystemDriver.webdav = createClient(
            FileSystemDriver.oRepoItem.url,
            {
                username: FileSystemDriver.oRepoItem.username,
                password: FileSystemDriver.oRepoItem.password
            }
        );
    }

    // ===============================================================
    
    static fnReadFileJSON(sFilePath)
    {
        return new Promise((fnResolv, fnReject) => {
            this.fnReadFile(sFilePath)
                .then(({ sData }) => {
                    fnResolv(JSON.parse(sData))
                })
                .catch((oE) => { fnReject(oE) })
        })
    }

    static fnReadFileCryptoJSON(sFilePath, sKey)
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

    static fnReadFile(sFilePath)
    {
        if (FileSystemDriver.oRepoItem.type == "localstorage") {
            return FileSystemDriver.fnReadFileLocalStorage(sFilePath)
        }
        if (FileSystemDriver.oRepoItem.type == "github") {
            return FileSystemDriver.fnReadFileGithub(sFilePath)
        }
        if (FileSystemDriver.oRepoItem.type == "webdav") {
            return FileSystemDriver.fnReadFileWebdav(sFilePath)
        }
    }

    static fnWriteFileJSON(sFilePath, mData)
    {
        return this.fnWriteFile(sFilePath, JSON.stringify(mData, null, 4))
    }

    static fnWriteFileCryptoJSON(sFilePath, mData, sKey)
    {
        return this.fnWriteFile(sFilePath, DES.encrypt(JSON.stringify(mData, null, 4), sKey).toString())
    }

    static fnWriteFile(sFilePath, sData)
    {
        if (FileSystemDriver.oRepoItem.type == "localstorage") {
            return FileSystemDriver.fnWriteFileLocalStorage(sFilePath, sData)
        }
        if (FileSystemDriver.oRepoItem.type == "github") {
            return FileSystemDriver.fnWriteFileGithub(sFilePath, sData)
        }
        if (FileSystemDriver.oRepoItem.type == "webdav") {
            return FileSystemDriver.fnWriteFileWebdav(sFilePath, sData)
        }
    }

    static fnCreateDir(sFilePath)
    {
        if (FileSystemDriver.oRepoItem.type == "webdav") {
            return FileSystemDriver.fnCreateDirWebdav(sFilePath)
        }
    }

    // ===============================================================

    static fnCreateDirWebdav(sFilePath)
    {
        return new Promise((fnResolv, fnReject) => {
            _l(">>>", sFilePath)
            FileSystemDriver.webdav.createDirectory(sFilePath)
            fnResolv();
        })
    }

    static fnReadFileLocalStorage(sFilePath)
    {
        return new Promise(async (fnResolv, fnReject) => {
            var sData = localStorage.getItem(sFilePath);
            fnResolv({ sData, sSHA: "" })
        })
    }

    static fnReadFileWebdav(sFilePath)
    {
        var oR = FileSystemDriver.oRepoItem

        return new Promise(async (fnResolv, fnReject) => {
            try {
                var oData = (await FileSystemDriver.webdav.getFileContents(sFilePath))
                var enc = new TextDecoder("utf-8");
                var sData = enc.decode(oData)
                FileSystemDriver.oSHA[sFilePath] = ""
                fnResolv({ sData, sSHA:"" })
            } catch (oE) {
                console.error(oE)
                fnReject(oE)
            }
        })
    }

    static fnReadFileGithub(sFilePath)
    {
        return new Promise(async (fnResolv, fnReject) => {
            var oR = FileSystemDriver.oRepoItem
            console.log('read', oR)
            sFilePath = sFilePath.replace(/^\/+/, '')
            return FileSystemDriver.octokit.rest.repos.getContent({
                owner: oR.login,
                repo: oR.repo,
                path: sFilePath,
            }).then(({ data }) => {
                var sData = decode(data.content)
                FileSystemDriver.oSHA[sFilePath] = data.sha
                console.log(FileSystemDriver.oSHA)
                fnResolv({sData, sSHA: data.sha})
            }).catch((oE) => {
                console.error(oE)
                fnReject(oE)
            })
        })
    }

    static fnWriteFileLocalStorage(sFilePath, sData)
    {
        return new Promise(async (fnResolv, fnReject) => {
            localStorage.setItem(sFilePath, sData)
            fnResolv()
        })
    }

    static fnWriteFileGithub(sFilePath, sData, sSHA=null)
    {
        return new Promise(async (fnResolv, fnReject) => {
            var oR = FileSystemDriver.oRepoItem
            console.log('write', oR)
            sFilePath = sFilePath.replace(/^\/+/, '')
            return FileSystemDriver.octokit.rest.repos.createOrUpdateFileContents({
                owner: oR.login,
                repo: oR.repo,
                path: sFilePath,
                sha: sSHA ? sSHA : FileSystemDriver.oSHA[sFilePath],
                message: FileSystemDriver.fnGetUpdateMessage(),
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

    static fnWriteFileWebdav(sFilePath, sData)
    {
        return new Promise(async (fnResolv, fnReject) => {
            var oR = FileSystemDriver.oRepoItem

            return new Promise(async (fnResolv, fnReject) => {
                try {
                    var enc = new TextEncoder()
                    var aData = enc.encode(sData)
                    await FileSystemDriver.webdav.putFileContents(
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

    static fnGetUpdateMessage() {
        return "update: "+(new Date())
    }
}