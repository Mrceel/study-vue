
const promisesCache = {}

export function loadScriptsAsync(scripts) {
    return Promise.all(
        scripts.map(function (scriptUrl) {
            if (typeof scriptUrl === 'string') {
                scriptUrl = {
                    url: scriptUrl,
                    // TODO Not supported type
                    type: scriptUrl.match(/\.css$/) ? 'css' : 'js'
                }
            }
            if (promisesCache[scriptUrl.url]) {
                return promisesCache[scriptUrl.url]
            }
            const promise = new Promise((resolve, reject) => {
                if (scriptUrl.type === 'js') {
                    const script = document.createElement('script')
                    script.src = scriptUrl.url
                    script.async = false
                    script.onload = function () {
                        resolve()
                    }
                    script.onerror = function () {
                        reject()
                    }
                    document.body.appendChild(script)
                } else if (scriptUrl.type === 'css') {
                    const link = document.createElement('link')
                    link.rel = 'stylesheet'
                    link.href = scriptUrl.url
                    link.onload = function () {
                        resolve()
                    }
                    link.onerror = function () {
                        reject()
                    }
                    document.body.appendChild(link)
                }
            })
            promisesCache[scriptUrl.url] = promise
            return promise
        })
    )
}

export function loadExampleCodeFromLocal() {
    try {
        return JSON.parse(decompressStr(localStorage.getItem(LOCAL_EXAMPLE_CODE_STORE_KEY)))
    } catch (e) {
        return null
    }
}

export function clearLocalExampleCode() {
    localStorage.removeItem(LOCAL_EXAMPLE_CODE_STORE_KEY)
}

export function loadExampleCode() {
    const localCode = loadExampleCodeFromLocal()
    if (localCode) {
        clearLocalExampleCode()
        // for sharing URL
        if (localCode.codeModified) {
            store.initialCode = CODE_CHANGED_FLAG
        }
        return Promise.resolve(localCode.code)
    }
    return new Promise((resolve, reject) => {
        // ignore c if code is provided
        let code = URL_PARAMS.code
        if (code) {
            try {
                // PENDING fallback to `c` if the decompressed code is not available?
                // TODO: auto-detect the encoder type?
                code = URL_PARAMS.enc === 'base64' ? decodeBase64(code) : decompressStr(code)
                // not considered as shared code if it's opened by echarts website like echarts-doc
                store.isSharedCode = !isTrustedOpener() && !!code
                // clear the opener
                window.opener = null
                return code ? resolve(code) : reject('code was decompressed but got nothing')
            } catch (e) {
                console.error(e)
                return reject('failed to decompress code')
            }
        }
        const glFolder = 'gl' in URL_PARAMS ? 'gl/' : ''
        const lang = store.typeCheck ? 'ts' : 'js'
        // fallback to line-simple if no c is provided
        const c = URL_PARAMS.c || 'line-simple'
        $.ajax(`${store.cdnRoot}/examples/${lang}/${glFolder}${c}.${lang}?_v_${store.version}`, {
            dataType: 'text',
            success(data) {
                resolve(data)
            },
            error() {
                reject('failed to load example', c)
            }
        })
    })
}