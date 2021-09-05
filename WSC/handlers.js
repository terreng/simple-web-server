
global.cachedFiles = [ ]
global.tempData = { }

function BaseHandler() {
    this.headersWritten = false
    this.writingHeaders = false
    this.pendingEnd = false
    this.responseCode = null
    this.responseHeaders = {}
    this.responseLength = 0
}
BaseHandler.prototype = {
    options: function() {
        if (this.app.opts.cors) {
            this.set_status(200)
            this.finish()
        } else {
            this.set_status(403)
            this.finish()
        }
    },
    error: function(msg, httpCode) {
        var defaultMsg = '<h1>' + httpCode + ' - ' + WSC.HTTPRESPONSES[httpCode] + '</h1>\n\n<p>' + msg + '</p>'
        if (this.request.method == "HEAD") {
            this.responseLength = 0
            this.writeHeaders(httpCode)
            this.finish()
            return
        } else {
            this.setHeader('content-type','text/html; charset=utf-8')
            if (this.app.opts['optCustom'+httpCode]) {
                this.fs.getByPath(this.app.opts['optCustom'+httpCode+'location'], (file) => {
                    if (! file.error && file.isFile) {
                        file.text(function(data) {
                            if (this.app.opts.optCustomusevar) {
                                if (this.app.opts.optCustomusevarvar.trim().length > 0) {
                                    var data = data.replaceAll(this.app.opts.optCustomusevarvar, this.request.origpath.htmlEscape())
                                } else {
                                    this.write('Error Replace Variable is blank', 500)
                                    this.finish()
                                    return
                                }
                            }
                            if (httpCode == 401) {
                                this.setHeader("WWW-Authenticate", "Basic")
                            }
                            this.write(data, httpCode)
                            this.finish()
                        }.bind(this))
                    } else {
                        if ([400,401,403,404].includes(httpCode)) {
                            this.write('Path of Custom '+httpCode+' html was not found. Custom '+httpCode+' is set to '+this.app.opts['optCustom'+httpCode+'location'], 500)
                            this.finish()
                        } else {
                            if (httpCode == 401) {
                                this.setHeader("WWW-Authenticate", "Basic")
                            }
                            this.write(defaultMsg, httpCode)
                            this.finish()
                        }
                    }
                })
            } else {
                if (httpCode == 401) {
                    this.setHeader("WWW-Authenticate", "Basic")
                }
                this.write(defaultMsg, httpCode)
                this.finish()
            }
        }
    },
    setCORS: function() {
        this.setHeader('access-control-allow-origin','*')
        this.setHeader('access-control-allow-methods','GET, POST, PUT, DELETE')
        this.setHeader('access-control-max-age','120')
    },
    get_argument: function(key,def) {
        if (this.request.arguments[key] !== undefined) {
            return this.request.arguments[key]
        } else {
            return def
        }
    },
    getHeader: function(k,defaultvalue) {
        return this.request.headers[k] || defaultvalue
    },
    setHeader: function(k,v) {
        this.responseHeaders[k] = v
        this.res.setHeader(k, v)
    },
    set_status: function(code) {
        console.assert(! this.headersWritten && ! this.writingHeaders)
        this.responseCode = code
    },
    writeHeaders: function(code, setMessage, callback) {
        if (code === undefined || isNaN(code)) { code = this.responseCode || 200 }
        this.writingHeaders = true
        if (setMessage !== false) {
            if (code == 200) {
                this.res.statusCode = 200
                this.res.statusMessage = 'OK'
            } else {
                this.res.statusCode = code
                this.res.statusMessage = WSC.HTTPRESPONSES[code]
            }
            if (this.responseHeaders['transfer-encoding'] === 'chunked') {
                // chunked encoding
            } else {
                console.assert(typeof this.responseLength == 'number')
                this.res.setHeader('content-length', this.responseLength)
            }

            var p = this.request.path.split('.')
            
            if (p.length > 1 && ! this.isDirectoryListing && ! this.responseHeaders['content-type']) {
                var ext = p[p.length-1].toLowerCase()
                var type = WSC.MIMETYPES[ext]
                if (type) {
                    var default_types = ['text/html',
                                         'text/xml',
                                         'text/plain',
                                         "text/vnd.wap.wml",
                                         "application/javascript",
                                         "application/rss+xml"]

                    if (default_types.includes(type)) {
                        type += '; charset=utf-8'
                    }
                    this.setHeader('content-type',type)
                }
            }
        }
        if (this.app.opts.cors) {
            this.setCORS()
        }
        if (callback && typeof callback == 'function') {
            callback()
        }
        this.writingHeaders = false
        this.headersWritten = true
        if (this.pendingEnd) {
            this.finish()
        }
    },
    writeChunk: function(data) {
        if (! this.headersWritten && ! this.writingHeaders) {
            this.writeHeaders()
        }
        if (typeof data == "string") {
            var data = Buffer.from(data)
        } else if (data instanceof ArrayBuffer) {
            var data = Buffer.from(data)
        }
        this.res.write(data)
    },
    write: function(data, code, opt_finish) {
        if (typeof data == "string") {
            var data = Buffer.from(data)
        } else if (data instanceof ArrayBuffer) {
            var data = Buffer.from(data)
        }
        var byteLength = data.byteLength
        console.assert(byteLength !== undefined)
        if (code === undefined) { code = 200 }
        this.responseLength += byteLength
        if (! this.headersWritten && ! this.writingHeaders) {
            this.writeHeaders(code)
        }
        this.res.write(data)
        if (opt_finish !== false) {
          this.finish()
        }
    },
    finish: function() {
        if (! this.headersWritten && ! this.writingHeaders) {
            this.writeHeaders()
        }
        if (this.writingHeaders) {
            this.pendingEnd = true
        } else {
            this.res.end()
        }
    }
}

function DirectoryEntryHandler(FileSystem, request, app, req, res) {
    this.headersWritten = false
    this.writingHeaders = false
    this.pendingEnd = false
    this.responseCode = null
    this.responseHeaders = {}
    this.responseLength = 0
    
    this.fs = FileSystem
    this.req = req
    this.res = res
    this.app = app
    this.request = request
    this.entry = null
    this.file = null
    this.readChunkSize = 4096 * 16
    this.fileOffset = 0
    this.fileEndOffset = 0
    this.bodyWritten = 0
    this.isDirectoryListing = false
}
DirectoryEntryHandler.prototype = {
    head: function() {
        this.get()
    },
    tryHandle: function() {
        console.log(this.request.ip + ':', 'Request',this.request.method, this.request.uri)
        function finished() {
            if (this.request.path == this.app.opts.optIpBlockList) {
                this.error('', 403)
                return
            }
            
            var filename = this.request.path.split('/').pop()
            if (filename == 'wsc.htaccess') {
                if ((this.request.method == 'GET' && ! this.app.opts.optGETHtaccess) ||
                    (this.request.method == 'HEAD' && ! this.app.opts.optGETHtaccess) ||
                    (this.request.method == 'PUT' && ! this.app.opts.optPUTPOSTHtaccess) ||
                    (this.request.method == 'POST' && ! this.app.opts.optPUTPOSTHtaccess) ||
                    (this.request.method == 'DELETE' && ! this.app.opts.optDELETEHtaccess)) {
                    this.error('', 400)
                    return
                }
            }
            
            if (this.app.opts.optUsebasicauth) {
                var validAuth = false
                var auth = this.request.headers['authorization']
                if (auth) {
                    if (auth.slice(0,6).toLowerCase() == 'basic ') {
                        var userpass = atob(auth.slice(6,auth.length)).split(':')
                        if (userpass[0] == this.app.opts.optAuthUsername &&
                            userpass[1] == this.app.opts.optAuthPassword) {
                            validAuth = true
                        }
                    }
                }

                if (! validAuth) {
                    this.error("", 401)
                    return
                }
            }

            if (this.app.opts.optModRewriteEnable) {
                var matches = this.request.uri.match(this.app.opts.optModRewriteRegexp)
                if (matches === null && this.app.opts.optModRewriteNegate ||
                    matches !== null && ! this.app.opts.optModRewriteNegate
                   ) {
                    console.log("Mod rewrite rule matched", matches, this.app.opts.optModRewriteRegexp, this.request.uri)
                    this.rewrite_to = this.app.opts.optModRewriteTo
                }
            }
            
            if (this[this.request.method.toLowerCase()]) {
                this[this.request.method.toLowerCase()]()
            } else {
                this.writeHeaders(501)
                this.finish()
            }
        }
        if (this.app.opts.optIpBlocking) {
            this.fs.getByPath(this.opts.optIpBlockList, function(file) {
                if (file && file.isFile && ! file.error) {
                    file.text(function(data) {
                        try {
                            var ipBlockList = JSON.parse(data)
                        } catch(e) {
                            console.log('Failed to parse Ip block list')
                        }
                        if (ipBlockList.includes(this.request.ip)) {
                            this.error('', 403)
                            console.log('Blocked Request From ' + this.request.ip)
                            return
                        } else {
                            finished.bind(this)()
                        }
                    }.bind(this))
                } else {
                    console.log('Location of IP block list was not found')
                }
            })
        } else {
            finished.bind(this)()
        }
    },
    deletePutHtaccess: function(allow, deny, callback, callbackSkip) {
        if (this.app.opts.optScanForHtaccess) {
            var fullrequestpath = this.request.origpath
            var finpath = fullrequestpath.split('/').pop();
            var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length);
            if (this.request.path == '') {
                var finalpath = '/'
            }
            var htaccesspath = finalpath+'wsc.htaccess'
            //console.log(htaccesspath)
            this.fs.getByPath(htaccesspath, (file) => {
                if (! file.error) {
                    file.text(function(dataa) {
                        try {
                            var origdata = JSON.parse(dataa)
                        } catch(e) {
                            this.responseLength = 0
                            this.writeHeaders(500)
                            this.finish()
                            return
                        }
                        var filerequested = this.request.origpath.split('/').pop();
                        var filefound = false
                        var auth = false
                        if (origdata.length == 0 || ! origdata.length) {
                            callback()
                            return
                        }
                        for (var i=0; i<origdata.length; i++) {
                            if (! origdata[i].type) {
                                this.htaccessError('missing type')
                                return
                            }
                            if (! origdata[i].request_path && origdata[i].type != 'directory listing') {
                                this.htaccessError('missing request path')
                                return
                            }
                            if (origdata[i].type == 403 && origdata[i].request_path == filerequested) {
                                this.error('', 403)
                                return
                            }
                            if ((origdata[i].request_path == filerequested && origdata[i].type == 'POSTkey') ||
                                (origdata[i].request_path == filerequested && origdata[i].type == 'serverSideJavaScript')) {
                                this.error('', 400)
                                return
                            }
                            if (origdata[i].type == 401 &&
                                ! auth &&
                                (origdata[i].request_path == filerequested || origdata[i].request_path == 'all files')) {
                                var authdata = origdata[i]
                                var auth = true
                            }
                            if ((origdata[i].type == allow && origdata[i].request_path == filerequested) ||
                                (origdata[i].type == allow && origdata[i].request_path == 'all files') ||
                                (origdata[i].type == deny && origdata[i].request_path == filerequested) ||
                                (origdata[i].type == deny && origdata[i].request_path == 'all files') && ! filefound) {
                                var data = origdata[i]
                                var filefound = true
                            }
                        }
                        //console.log(filefound)
                        if (auth) {
                            if (! authdata.username) {
                                this.htaccessError('missing Auth Username')
                                return
                            }
                            if (! authdata.password) {
                                this.htaccessError('missing Auth Password')
                                return
                            }
                            var validAuth = false
                            var auth = this.request.headers['authorization']
                            if (auth) {
                                if (auth.slice(0,6).toLowerCase() == 'basic ') {
                                    var userpass = atob(auth.slice(6,auth.length)).split(':')
                                    if (userpass[0] == authdata.username && userpass[1] == authdata.password) {
                                        validAuth = true
                                    }
                                }
                            }
                            if (! validAuth) {
                                this.error("", 401)
                                return
                            }
                        }
                        if (filefound) {
                            if (data.type == allow) {
                                callbackSkip()
                            } else if (data.type == deny) {
                                this.responseLength = 0
                                this.writeHeaders(400)
                                this.finish()
                                return
                            }
                        } else {
                            callback()
                        }
                    }.bind(this))
                } else {
                    callback()
                }
            })
        } else {
            callback()
        }
    },
    delete: function() {
        function deleteMain() {
            this.fs.getByPath(this.request.path, function(entry) {
                if (entry.error) {
                    this.writeHeaders(404)
                    this.finish()
                    return
                }
                entry.remove(function(e) {
                    if (e.error) {
                        this.writeHeaders(500)
                        this.finish()
                        return
                    }
                    this.writeHeaders(200)
                    this.finish()
                }.bind(this))
                
            }.bind(this))
        }
        function deleteCheck() {
            if (! this.app.opts.optDelete) {
                this.responseLength = 0
                this.writeHeaders(400)
                this.finish()
                return
            } else {
                deleteMain.bind(this)()
            }
        }
        this.deletePutHtaccess('allow delete', 'deny delete', deleteCheck.bind(this), deleteMain.bind(this))
    },
    post: function() {
        var htaccessPath = WSC.utils.stripOffFile(this.request.origpath)
        this.fs.getByPath(htaccessPath + 'wsc.htaccess', function(file) {
            if (file && ! file.error) {
                file.text(function(data) {
                    try {
                        var origdata = JSON.parse(data)
                    } catch(e) {
                        this.write('Htaccess JSON parse error\n\nError: ' + e, 500)
                        this.finish()
                        return
                    }
                    if (origdata.length == 0 || ! origdata.length) {
                        this.write('htaccess has no length value', 500)
                        this.finish()
                        return
                    }
                    var filerequested = this.request.origpath.split('/').pop()
                    var filefound = false
                    var auth = false
                    for (var i=0; i<origdata.length; i++) {
                        if (! origdata[i].type) {
                            this.htaccessError('missing type')
                            return
                        }
                        if (! origdata[i].request_path && origdata[i].type != 'directory listing') {
                            this.htaccessError('missing request path')
                            return
                        }
                        origdata[i].original_request_path = origdata[i].request_path
                        origdata[i].filerequested = filerequested
                        origdata[i].request_path = WSC.utils.htaccessFileRequested(origdata[i].request_path, this.app.opts.index)
                        if (origdata[i].type == 401 &&
                            ! auth &&
                            (origdata[i].request_path == filerequested || origdata[i].request_path == 'all files')) {
                            var authdata = origdata[i]
                            var auth = true
                        }
                        if (origdata[i].type == 403 && origdata[i].request_path == filerequested) {
                            this.error('', 403)
                            return
                        }
                        if (origdata[i].type == 'POSTkey' && ! filefound) {
                            if (this.request.origpath.split('/').pop() == origdata[i].original_request_path || 
                                    (origdata[i].original_request_path.split('.').pop() == 'html' && 
                                    origdata[i].original_request_path.split('/').pop().split('.')[0] == this.request.origpath.split('/').pop() &&
                                    this.app.opts.optExcludeDotHtml) ||
                                    (origdata[i].original_request_path.split('/').pop() == 'index.html' && 
                                    this.request.origpath.endsWith('/') &&
                                    this.app.opts.index) ||
                                    (origdata[i].original_request_path.split('.').pop() == 'htm' && 
                                    origdata[i].original_request_path.split('/').pop().split('.')[0] == this.request.origpath.split('/').pop()) && 
                                    this.app.opts.optExcludeDotHtml && this.app.opts.optExcludeDotHtm) {
                                var data = origdata[i]
                                var filefound = true
                            }
                        }
                    }
                    // Still need to validate POST key
                    if (auth) {
                        if (! authdata.username) {
                            this.htaccessError('missing Auth Username')
                            return
                        }
                        if (! authdata.password) {
                            this.htaccessError('missing Auth Password')
                            return
                        }
                        var validAuth = false
                        var auth = this.request.headers['authorization']
                        if (auth) {
                            if (auth.slice(0,6).toLowerCase() == 'basic ') {
                                var userpass = atob(auth.slice(6,auth.length)).split(':')
                                if (userpass[0] == authdata.username && userpass[1] == authdata.password) {
                                    validAuth = true
                                }
                            }
                        }
                        if (! validAuth) {
                            this.error("", 401)
                            return
                        }
                    }
                    if (filefound) {
                        if (! data.key) {
                            this.htaccessError('missing key')
                            return
                        }
                        this.fs.getByPath(WSC.utils.stripOffFile(this.request.origpath) + data.original_request_path, function(file) {
                            if (file && ! file.error && file.isFile) {
                                file.text(function(dataa) {
                                    var contents = dataa
                                    var validFile = false
                                    var key = contents.replaceAll(' ', '').split('postKey=')
                                    if (key.length > 1) {
                                        var key = key.pop()
                                        var key = key.substring(1, key.length).split('"')[0].split("'")[0]
                                        if (key == data.key) {
                                            var validFile = true
                                        }
                                    }
                                    if (validFile) {
                                        var req = this.request
                                        var res = this
                                        var clearModuleCache = function() {
                                            for (var i=0; i<global.cachedFiles.length; i++) {
                                                delete require.cache[require.resolve(global.cachedFiles[i])]
                                            }
                                            global.cachedFiles = [ ]
                                        }
                                        var requireFile = function(path) {
                                            var path = res.fs.mainPath + WSC.utils.relativePath(path, WSC.utils.stripOffFile(res.request.origpath))
                                            if (! global.cachedFiles.includes(path)) {
                                                global.cachedFiles.push(path)
                                            }
                                            return require(path)
                                        }
                                        if (! global.tempData) {
                                            global.tempData = { }
                                        }
                                        try {
                                            eval('(function() {var handler = function(req, res, httpRequest, appInfo, clearModuleCache, requireFile) {' + dataa + '};handler(req, res, WSC.httpRequest, {"server": "Simple Web Server"}, clearModuleCache, requireFile)})();')
                                        } catch(e) {
                                            console.error(e)
                                            this.write('Error with your script, check logs', 500)
                                            this.finish()
                                        }
                                    } else {
                                        this.write('The keys do not match or were not found', 403)
                                    }
                                }.bind(this))
                            } else if (file.isDirectory) {
                                this.error('SSJS cannot be performed on a directory', 500)
                            } else {
                                this.error('', 404)
                            }
                        }.bind(this))
                    } else {
                        this.error('', 404)
                    }
                }.bind(this))
            } else {
                this.error('', 404)
            }
        }.bind(this))
    },
    put: function() {
        function putMain() {
            this.fs.getByPath(this.request.path, function(entry) {
                if (entry.error) {
                    var file = this.fs.createWriteStream(this.request.origpath)
                    file.on('error', function (err) {
                        console.error('error writing file', err)
                        this.writeHeaders(500)
                        this.finish()
                    }.bind(this))
                    this.req.pipe(file)
                    this.req.on('end', function () {
                        // TODO - Cleanup file
                        this.writeHeaders(200)
                        this.finish()
                    }.bind(this))
                } else if (this.app.opts.optAllowReplaceFile) {
                    entry.remove(function(e) {
                        if (e.error) {
                            this.writeHeaders(500)
                            this.finish()
                        } else {
                            var file = this.fs.createWriteStream(this.request.origpath)
                            file.on('error', function (err) {
                                // TODO - Cleanup file
                                console.error('error writing file', err)
                                this.writeHeaders(500)
                                this.finish()
                            }.bind(this))
                            this.req.pipe(file)
                            this.req.on('end', function () {
                                this.writeHeaders(200)
                                this.finish()
                            }.bind(this))
                        }
                    }.bind(this))
                } else {
                    this.writeHeaders(400)
                    this.finish()
                }
            }.bind(this))
        }
        function putCheck() {
            if (! this.app.opts.optUpload) {
                this.responseLength = 0
                this.writeHeaders(400)
                this.finish()
                return
            } else {
                putMain.bind(this)()
            }
        }
        this.deletePutHtaccess('allow put', 'deny put', putCheck.bind(this), putMain.bind(this))
    },
    get: function() {
        this.setHeader('accept-ranges','bytes')
        this.setHeader('connection','keep-alive')
        if (! this.fs) {
            this.write("error: need to select a directory to serve",500)
            return
        }
        this.request.isVersioning = false
        if (this.app.opts.optCacheControl) {
            this.setHeader('Cache-Control',this.app.opts.optCacheControlValue)
        }
        if (this.app.opts.optExcludeDotHtml && ! this.request.origpath.endsWith("/")) {
            var htmhtml = this.app.opts.optExcludeDotHtm ? 'htm' : 'html';
            var extension = this.request.path.split('.').pop();
            var more = this.request.uri.split('.'+htmhtml).pop()
            if (extension == htmhtml) {
                var path = this.request.path
                if (htmhtml == 'html') {
                    var newpath = path.substring(0, path.length - 5);
                } else {
                    var newpath = path.substring(0, path.length - 4);
                }
                if (more != this.request.uri) {
                    var newpath = newpath+more
                }
                this.responseLength = 0
                this.setHeader('location', newpath)
                this.writeHeaders(307)
                this.finish()
                return
            }
        }
        if (this.rewrite_to) {
            this.fs.getByPath(this.rewrite_to, this.onEntry.bind(this))
        } else {
            this.fs.getByPath(this.request.path, this.onEntry.bind(this))
        }
    },
    onEntry: function(entry) {
        this.entry = entry

        function onEntryMain() {
            if (this.entry && this.entry.isFile && this.request.origpath.endsWith('/')) {
                this.setHeader('location', this.request.path)
                this.writeHeaders(301)
                this.finish()
                return
            }
            if (this.entry && this.entry.isDirectory && ! this.request.origpath.endsWith('/')) {
                var newloc = this.request.origpath + '/'
                this.setHeader('location', newloc) // XXX - encode latin-1 somehow?
                this.responseLength = 0
                //console.log('redirect ->',newloc)
                this.writeHeaders(301)
                this.finish()
                return
            }
            if (! this.entry) {
                this.error('no entry',404)
            } else if (this.entry.error) {
                if (this.entry.error.code == 'EPERM') {
                    this.error('', 403)
                } else {
                    this.error('entry not found: ' + (this.rewrite_to || this.request.path), 404)
                }
            } else if (this.entry.isFile) {
                this.renderFileContents(this.entry)
            } else {
                function alldone(results) {
                    if (this.app.opts.index) {
                        for (var i=0; i<results.length; i++) {
                            if (results[i].name.toLowerCase() == 'index.xhtml' || results[i].name.toLowerCase() == 'index.xhtm') {
                                this.setHeader('content-type','application/xhtml+xml; charset=utf-8')
                                this.renderFileContents(results[i])
                                return
                            }
                            else if (results[i].name.toLowerCase() == 'index.html' || results[i].name.toLowerCase() == 'index.htm') {
                                this.setHeader('content-type','text/html; charset=utf-8')
                                this.renderFileContents(results[i])
                                return
                            }
                        }
                    }
                    if (this.app.opts.optDir404 && this.app.opts.index) {
                        this.error("", 404)
                    } else {
                        this.renderDirListing(results)
                    }
                }
                this.getDirContents(this.entry, alldone.bind(this))
            }
        }

        function excludedothtmlcheck() {
            if (this.app.opts.optExcludeDotHtml && this.request.path != '' && ! this.request.origpath.endsWith("/")) {
                var htmHtml = this.app.opts.optExcludeDotHtm ? '.htm' : '.html'
                this.fs.getByPath(this.request.path+htmHtml, function(file) {
                    if (! file.error && file.isFile) {
                        //console.log('file found')
                        this.setHeader('content-type','text/html; charset=utf-8')
                        this.renderFileContents(file)
                        return
                    } else {
                        onEntryMain.bind(this)()
                    }
                }.bind(this))
            } else {
                onEntryMain.bind(this)()
            }
        }
    
        if (this.app.opts.optScanForHtaccess) {
            var fullrequestpath = this.request.origpath
            var finpath = fullrequestpath.split('/').pop();
            var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length);
            if (this.request.path == '') {
                var finalpath = '/'
            }
            var htaccesspath = finalpath+'wsc.htaccess'
            this.fs.getByPath(htaccesspath, (file) => {
                if (! file.error && file.isFile) {
                    file.text(function(dataa) {
                        try {
                            var origdata = JSON.parse(dataa)
                        } catch(e) {
                            this.write('<p>wsc.htaccess file found, but it is not a valid json array. Please read the htaccess readme <a href="https://github.com/terreng/simple-web-server/blob/main/howTo/HTACCESS.md">here</a></p>\n\n\n'+e, 500)
                            this.finish()
                            console.error('htaccess json array error')
                            return
                        }

                        function htaccessMain(filerequested) {
                            var filefound = false
                            var auth = false
                            var authdata = false
                            var j=0
                            var data = false
                            var htaccessHeaders = [ ]
                            var additionalHeaders = false
                            var hasPost = false
                            if (origdata.length == 0 || ! origdata.length) {
                                excludedothtmlcheck.bind(this)()
                                return
                            }
                            for (var i=0; i<origdata.length; i++) {
                                if (! origdata[i].type) {
                                    this.htaccessError('missing type')
                                    return
                                }
                                if (! origdata[i].request_path && origdata[i].type != 'directory listing') {
                                    this.htaccessError('missing request path')
                                    return
                                }
                                origdata[i].original_request_path = origdata[i].request_path
                                origdata[i].filerequested = filerequested
                                origdata[i].request_path = WSC.utils.htaccessFileRequested(origdata[i].request_path, this.app.opts.index)
                                if (origdata[i].type == 401 &&
                                    ! auth &&
                                    (origdata[i].request_path == filerequested || origdata[i].request_path == 'all files') && ! this.request.isVersioning) {
                                    var auth = true
                                    var authdata = origdata[i]
                                }
                                if (origdata[i].type == 'directory listing' &&
                                    this.request.origpath.split('/').pop() == '' &&
                                    ! filefound) {
                                    var data = origdata[i]
                                    var filefound = true
                                }
                                if (origdata[i].type == 'send directory contents' && origdata[i].request_path == filerequested) {
                                    var extension = origdata[i].original_request_path.split('.').pop()
                                    if (extension == 'html' || extension == 'htm') {
                                        var data = origdata[i]
                                        var filefound = true
                                    }
                                }
                                if (origdata[i].type == 'serverSideJavaScript' && ! filefound) {
                                    if (this.request.origpath.split('/').pop() == origdata[i].original_request_path || 
                                            (origdata[i].original_request_path.split('.').pop() == 'html' && 
                                            origdata[i].original_request_path.split('/').pop().split('.')[0] == this.request.origpath.split('/').pop() &&
                                            this.app.opts.optExcludeDotHtml) ||
                                            (origdata[i].original_request_path.split('/').pop() == 'index.html' && 
                                            this.request.origpath.endsWith('/') &&
                                            this.app.opts.index) ||
                                            (origdata[i].original_request_path.split('.').pop() == 'htm' && 
                                            origdata[i].original_request_path.split('/').pop().split('.')[0] == this.request.origpath.split('/').pop() && 
                                            this.app.opts.optExcludeDotHtml && this.app.opts.optExcludeDotHtm)) {
                                        var data = origdata[i]
                                        var filefound = true
                                    }
                                }
                                if ((origdata[i].request_path == filerequested || origdata[i].request_path == 'all files') && origdata[i].type == 'versioning' && ! filefound && ! this.request.isVersioning) {
                                    var data = origdata[i]
                                    var filefound = true
                                }
                                if ((origdata[i].request_path == filerequested || origdata[i].request_path == 'all files') &&
                                    ! filefound &&
                                    origdata[i].type != 'allow delete' &&
                                    origdata[i].type != 'allow put' &&
                                    origdata[i].type != 'deny delete' &&
                                    origdata[i].type != 'deny put' &&
                                    origdata[i].type != 401 &&
                                    origdata[i].type != 'directory listing' &&
                                    origdata[i].type != 'additional header' &&
                                    origdata[i].type != 'send directory contents' &&
                                    origdata[i].type != 'POSTkey' &&
                                    origdata[i].type != 'serverSideJavaScript' &&
                                    origdata[i].type != 'versioning') {
                                        var data = origdata[i]
                                        //console.log(data)
                                        var filefound = true
                                }
                                if (this.request.origpath.split('/').pop() == origdata[i].original_request_path && origdata[i].type == 'POSTkey') {
                                    var hasPost = true
                                }
                                //console.log(origdata[i].request_path == filerequested)
                                if ((origdata[i].request_path == filerequested || origdata[i].request_path == 'all files') &&
                                    origdata[i].type == 'additional header') {
                                    //console.log('additional header')
                                    var additionalHeaders = true
                                    htaccessHeaders[j] = origdata[i]
                                    j++
                                }
                            }
                            //console.log(data)
                            //console.log(authdata)
                            //console.log(filefound)
                            if (hasPost && data.type != 'serverSideJavaScript') {
                                this.error('', 400)
                                return
                            }
                            function htaccessCheck2() {
                                if (filefound) {
                                    if (data.type == 301 || data.type == 302 || data.type == 307) {
                                        if (! data.redirto) {
                                            this.htaccessError('missing redirect location')
                                            return
                                        }
                                        this.setHeader('location', data.redirto)
                                        this.responseLength = 0
                                        this.writeHeaders(data.type)
                                        this.finish()
                                    } else if (data.type == 'denyDirectAccess') {
                                        var method = this.request.headers['sec-fetch-dest']
                                        //console.log(method)
                                        if (method == "document") {
                                            this.error('', 403)
                                        } else {
                                            excludedothtmlcheck.bind(this)()
                                        }
                                    } else if (data.type == 403) {
                                        this.error('', 403)
                                    } else if (data.type == 'directory listing') {
                                        function finished(results) {
                                            this.renderDirListing(results)
                                        }
                                        this.getDirContents(entry, finished.bind(this))
                                    } else if (data.type == 'send directory contents') {
                                        if (! data.dir_to_send || data.dir_to_send.replace(' ', '') == '') {
                                            data.dir_to_send = './'
                                        }
                                        function finished(results) {
                                            var fullrequestpath = this.request.origpath
                                            var finpath = fullrequestpath.split('/').pop();
                                            var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length) + data.original_request_path
                                            //console.log(filepath)
                                            this.fs.getByPath(finalpath, (file) => {
                                                if (! file.error && file.isFile) {
                                                    file.text(function(dataa) {
                                                        var html = [dataa]
                                                        for (var w=0; w<results.length; w++) {
                                                            var rawname = results[w].name
                                                            var name = encodeURIComponent(results[w].name)
                                                            var isdirectory = results[w].isDirectory
                                                            var modified = WSC.utils.lastModified(results[w].modificationTime)
                                                            var filesize = results[w].size
                                                            var filesizestr = WSC.utils.humanFileSize(results[w].size)
                                                            var modifiedstr = WSC.utils.lastModifiedStr(results[w].modificationTime)
                                                            if (! results[w].name.startsWith('.')) {
                                                                if (rawname != 'wsc.htaccess' || this.app.opts.optDirListingHtaccess) {
                                                                    html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>')
                                                                }
                                                            } else if (this.app.opts.optDotFilesDirListing) {
                                                                html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>')
                                                            }
                                                        }
                                                        this.setHeader('content-type','text/html; charset=utf-8')
                                                        this.write(html.join('\n'))
                                                        this.finish()
                                                    }.bind(this))
                                                } else {
                                                    this.write('An unexpected error occured. Please check your wsc.htaccess file for any configuration errors.\nPlease remember, the send directory listing feature CANNOT use "all files", you must specify each file separately.\nPlease check your settings. If everything seems to be in place, please report an issue on github.\n\nhttps://github.com/kzahel/web-server-chrome\n\nPlease copy and paste the following information.\n\n\nfilepath: '+filepath+'\nrequestURI: '+this.request.uri+'\nrequested file (according to htaccess): '+data.original_request_path+'\nrequested file (according to requestURI): '+data.filerequested, 500)
                                                    this.finish()
                                                }
                                            })
                                        }
                                        var path2Send = data.dir_to_send
                                        var fullrequestpath = this.request.origpath
                                        var finpath = fullrequestpath.split('/').pop();
                                        var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length);
                                        if (this.request.path == '') {
                                            var finalpath = '/'
                                        }
                                        var split1 = finalpath.split('/')
                                        var split2 = path2Send.split('/')
                                        
                                        if (! path2Send.startsWith('/')) {
                                            for (var w=0; w<split2.length; w++) {
                                                if (split2[w] == '' || split2[w] == '.') {
                                                    // . means current directory. Leave this here for spacing
                                                } else if (split2[w] == '..') {
                                                    if (split1.length > 0) {
                                                        var split1 = WSC.utils.stripOffFile(split1.join('/')).split('/')
                                                    }
                                                } else {
                                                    split1.push(split2[w])
                                                }
                                            }
                                            var path2Send = split1.join('/')
                                            if (! path2Send.startsWith('/')) {
                                                var path2Send = '/' + path2Send
                                            }
                                        }
                                        
                                        //console.log(finalpath)
                                        //console.log(data)
                                        this.fs.getByPath(path2Send, function(entryy) {
                                            if (! entry.error) {
                                                this.getDirContents(entryy, finished.bind(this))
                                            } else {
                                                this.htaccessError('invalid path to send dir contents')
                                            }
                                        }.bind(this))
                                    } else if (data.type == 'versioning') {
                                        //console.log('versioning')
                                        if (! data.version_data || data.version_data.length == 0) {
                                            this.htaccessError('missing version data')
                                            return
                                        }
                                        if (! data.variable) {
                                            this.htaccessError('missing variable')
                                            return
                                        }
                                        if (! data.default) {
                                            this.htaccessError('missing default file selection')
                                            return
                                        }
                                        var versionData = data.version_data
                                        var vdata4 = this.request.arguments[data.variable]
                                        if ( ! versionData[vdata4]) {
                                            vdata4 = data.default
                                        }
                                        var vdataa = versionData[vdata4]
                                        var fullrequestpath = this.request.origpath
                                        var finpath = fullrequestpath.split('/').pop();
                                        var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length);
                                        if (this.request.path == '') {
                                            var finalpath = '/'
                                        }
                                        var split1 = finalpath.split('/')
                                        var split2 = vdataa.split('/')
                                        if (! vdataa.startsWith('/')) {
                                            for (var w=0; w<split2.length; w++) {
                                                if (split2[w] == '' || split2[w] == '.') {
                                                    // . means current directory. Leave this here for spacing
                                                } else if (split2[w] == '..') {
                                                    if (split1.length > 0) {
                                                        var split1 = WSC.utils.stripOffFile(split1.join('/')).split('/')
                                                    }
                                                } else {
                                                    split1.push(split2[w])
                                                }
                                            }
                                            var vdataa = split1.join('/')
                                            if (! vdataa.startsWith('/')) {
                                                var vdataa = '/' + vdataa
                                            }
                                            //console.log(vdataa)
                                        }
                                        //console.log(vdataa)
                                        this.fs.getByPath(vdataa, function(file) {
                                            if (file && ! file.error) {
                                                this.request.path = vdataa
                                                if (file.isFile) {
                                                    this.request.origpath = vdataa
                                                    this.request.uri = vdataa
                                                } else {
                                                    if (vdataa.endsWith("/")) {
                                                        this.request.origpath = vdataa
                                                        this.request.uri = vdataa
                                                    } else {
                                                        this.request.origpath = vdataa+'/'
                                                        this.request.uri = vdataa+'/'
                                                    }
                                                }
                                                this.request.isVersioning = true
                                                this.onEntry(file)
                                            } else {
                                                this.write('path in htaccess file for version '+vdata4+' is missing or the file does not exist. Please check to make sure you have properly inputed the value', 500)
                                            }
                                        }.bind(this))
                                    } else if (data.type == 'serverSideJavaScript') {
                                        if (! data.key) {
                                            this.htaccessError('missing key')
                                            return
                                        }
                                        this.fs.getByPath(WSC.utils.stripOffFile(this.request.origpath) + data.original_request_path, function(file) {
                                            if (file && ! file.error && file.isFile) {
                                                file.text(function(dataa) {
                                                    var contents = dataa
                                                    var validFile = false
                                                    var key = contents.replaceAll(' ', '').split('SSJSKey=')
                                                    if (key.length > 1) {
                                                        var key = key.pop()
                                                        var key = key.substring(1, key.length).split('"')[0].split("'")[0]
                                                        if (key == data.key) {
                                                            var validFile = true
                                                        }
                                                    }
                                                    if (validFile) {
                                                        var req = this.request
                                                        var res = this
                                                        var clearModuleCache = function() {
                                                            for (var i=0; i<global.cachedFiles.length; i++) {
                                                                delete require.cache[require.resolve(global.cachedFiles[i])]
                                                            }
                                                            global.cachedFiles = [ ]
                                                        }
                                                        var requireFile = function(path) {
                                                            var path = res.fs.mainPath + WSC.utils.relativePath(path, WSC.utils.stripOffFile(res.request.origpath))
                                                            if (! global.cachedFiles.includes(path)) {
                                                                global.cachedFiles.push(path)
                                                            }
                                                            return require(path)
                                                        }
                                                        if (! global.tempData) {
                                                            global.tempData = { }
                                                        }
                                                        try {
                                                            eval('(function() {var handler = function(req, res, httpRequest, appInfo, clearModuleCache, requireFile) {' + dataa + '};handler(req, res, WSC.httpRequest, {"server": "Simple Web Server"}, clearModuleCache, requireFile)})();')
                                                        } catch(e) {
                                                            console.error(e)
                                                            this.write('Error with your script, check logs', 500)
                                                            this.finish()
                                                        }
                                                    } else {
                                                        this.write('The keys do not match or were not found', 403)
                                                    }
                                                }.bind(this))
                                            } else if (file.isDirectory) {
                                                this.error('SSJS cannot be performed on a directory', 500)
                                            } else {
                                                this.error('', 404)
                                            }
                                        }.bind(this))
                                    } else {
                                        excludedothtmlcheck.bind(this)()
                                    }
                                } else {
                                    excludedothtmlcheck.bind(this)()
                                }
                            }
                            //console.log(htaccessHeaders)
                            if (additionalHeaders) {
                                for (var i=0; i<htaccessHeaders.length; i++) {
                                    this.setHeader(htaccessHeaders[i].headerType, htaccessHeaders[i].headerValue)
                                }
                            }
                            if (auth && authdata.type == 401) {
                                 if (! authdata.username) {
                                     this.htaccessError('missing Auth Username')
                                     return
                                 }
                                 if (! authdata.password) {
                                     this.htaccessError('missing Auth Password')
                                     return
                                 }
                                    var validAuth = false
                                    var auth = this.request.headers['authorization']
                                    if (auth) {
                                        if (auth.slice(0,6).toLowerCase() == 'basic ') {
                                            var userpass = atob(auth.slice(6,auth.length)).split(':')
                                            if (userpass[0] == authdata.username && userpass[1] == authdata.password) {
                                                validAuth = true
                                            }
                                        }
                                    }
                                    if (! validAuth) {
                                        this.error("", 401)
                                    }
                                    if (validAuth) {
                                        htaccessCheck2.bind(this)()
                                    }
                            } else {
                                htaccessCheck2.bind(this)()
                            }
                        }
                        var filerequest = this.request.origpath

                        if (this.app.opts.optExcludeDotHtml) {
                            var htmHtml = this.app.opts.optExcludeDotHtm ? '.htm' : '.html'
                            this.fs.getByPath(this.request.path+htmHtml, (file) => {
                                if (! file.error) {
                                    if (this.request.origpath.endsWith("/")) {
                                        htaccessMain.bind(this)('')
                                        return
                                    }
                                    var filerequested = this.request.path+htmHtml
                                    var filerequested = filerequested.split('/').pop();
                                    var filerequested = WSC.utils.htaccessFileRequested(filerequested, this.app.opts.index)
                                    htaccessMain.bind(this)(filerequested)
                                    return
                                } else {
                                    if (this.entry && this.entry.isDirectory && ! this.request.origpath.endsWith('/')) {
                                        var newloc = this.request.origpath + '/'
                                        this.setHeader('location', newloc)
                                        this.responseLength = 0
                                        this.writeHeaders(301)
                                        this.finish()
                                        return
                                    }
                                    var filerequested = filerequest.split('/').pop();
                                    //console.log(filerequested)
                                    var filerequested = WSC.utils.htaccessFileRequested(filerequested, this.app.opts.index)
                                        htaccessMain.bind(this)(filerequested)
                                        return
                                }
                            })
                        } else {
                            if (this.entry && this.entry.isDirectory && ! this.request.origpath.endsWith('/')) {
                                var newloc = this.request.origpath + '/'
                                this.setHeader('location', newloc)
                                this.responseLength = 0
                                this.writeHeaders(301)
                                this.finish()
                                return
                            }
                            var filerequested = filerequest.split('/').pop();
                            //console.log(filerequested)
                            var filerequested = WSC.utils.htaccessFileRequested(filerequested, this.app.opts.index)
                            htaccessMain.bind(this)(filerequested)
                            return
                        }
                    }.bind(this))
                } else {
                    excludedothtmlcheck.bind(this)()
                }
            })
        } else {
            excludedothtmlcheck.bind(this)()
        }
    },
    renderFileContents: function(entry) {
        if (! entry.path) {
            this.error('', 404)
            return
        }
        function readyToSend() {
            send(this.req, entry.path, {index: false, lastModified: false, dotfiles: 'allow', etag: false, cacheControl: false})
                .on('error', function(error) {
                    this.res.statusCode = error.status
                    this.res.statusMessage = WSC.HTTPRESPONSES[error.status] || 'Internal Server Error'
                    this.res.write('error')
                    this.res.end()
                }.bind(this))
                .pipe(this.res)
        }
        if (! this.headersWritten) {
            this.writeHeaders(200, false, readyToSend.bind(this))
        } else {
            readyToSend.bind(this)()
        }
    },
    entriesSortFunc: function(a,b) {
        var anl = a.name.toLowerCase()
        var bnl = b.name.toLowerCase()
        if (a.isDirectory && b.isDirectory) {
            return anl.localeCompare(bnl)
        } else if (a.isDirectory) {
            return -1
        } else if (b.isDirectory) {
            return 1
        } else {
            /// both files
            return anl.localeCompare(bnl)
        }
            
    },
    renderDirectoryListingJSON: function(origResults) {
        this.setHeader('content-type','application/json; charset=utf-8')
        var results = [ ]
        for (var i=0; i<origResults.length; i++) {
            if (! origResults[i].name.startsWith('.')) {
                if (origResults[i].name != 'wsc.htaccess' || this.app.opts.optDirListingHtaccess) {
                    results.push(origResults[i])
                }
            } else if (this.app.opts.optDotFilesDirListing) {
                results.push(origResults[i])
            }
        }
        this.write(JSON.stringify(results.map(function(f) { return { name:f.name,
                                                                     fullPath:f.fullPath,
                                                                     isFile:f.isFile,
                                                                     isDirectory:f.isDirectory }
                                                          }), null, 2))
    },
    renderDirectoryListingStaticJs: function(results) {
        if (! WSC.static_template_data) {
            return this.renderDirectoryListing(results)
        }
        var html = ['<!DOCTYPE html>']
        html.push('<html lang="en">')
        html.push('<head>')
        html.push('<meta charset="utf-8">')
        html.push('<meta name="google" value="notranslate">')
        html.push('<title id="title"></title>')
        html.push('</head>')
        html.push('<div id="staticDirectoryListing">')
        html.push('<style>li.directory {background:#aab}</style>')
        html.push('<a href="../?static=1">parent</a>')
        html.push('<ul>')
        results.sort( this.entriesSortFunc )
        for (var i=0; i<results.length; i++) {
            var name = results[i].name.htmlEscape()
            if (results[i].isDirectory) {
                html.push('<li class="directory"><a href="' + name + '/?static=1">' + name + '</a></li>')
            } else {
                if (! results[i].name.startsWith('.')) {
                    if (name != 'wsc.htaccess' || this.app.opts.optDirListingHtaccess) {
                        html.push('<li><a href="' + name + '?static=1">' + name + '</a></li>')
                    }
                } else if (this.app.opts.optDotFilesDirListing) {
                    html.push('<li><a href="' + name + '?static=1">' + name + '</a></li>')
                }
            }
        }
        html.push('</ul></div>')
        
        html.push('<div style="display:none;" id="javascriptDirectoryListing">')
        html.push(WSC.static_template_data)
        html.push('<script>start("'+this.request.origpath+'")</script>')
        if (this.request.origpath != '/') {
            html.push('<script>onHasParentDirectory();</script>')
        }
        for (var w=0; w<results.length; w++) {
            var rawname = results[w].name
            var name = encodeURIComponent(results[w].name)
            var isdirectory = results[w].isDirectory
            var modified = WSC.utils.lastModified(results[w].modificationTime)
            var filesize = results[w].size
            var filesizestr = WSC.utils.humanFileSize(results[w].size)
            var modifiedstr = WSC.utils.lastModifiedStr(results[w].modificationTime)
            if (! results[w].name.startsWith('.')) {
                if (rawname != 'wsc.htaccess' || this.app.opts.optDirListingHtaccess) {
                    html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>')
                }
            } else if (this.app.opts.optDotFilesDirListing) {
                html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>')
            }
        }
        html.push('</div>')
        html.push('<script>document.getElementById("staticDirectoryListing").style = "display:none;"</script>')
        html.push('<script>document.getElementById("javascriptDirectoryListing").style = "display:block;"</script>')
        html.push('</body></html>')
        
        this.setHeader('content-type','text/html; charset=utf-8')
        this.write(html.join('\n'))
        this.finish()
    },
    renderDirectoryListingTemplate: function(results) {
        if (! WSC.template_data) {
            return this.renderDirectoryListing(results)
        }
        var html = [WSC.template_data]
        html.push('<script>start("'+this.request.origpath+'")</script>')
        if (this.request.origpath != '/') {
            html.push('<script>onHasParentDirectory();</script>')
        }
        for (var w=0; w<results.length; w++) {
            var rawname = results[w].name
            var name = encodeURIComponent(results[w].name)
            var isdirectory = results[w].isDirectory
            var modified = WSC.utils.lastModified(results[w].modificationTime)
            var filesize = results[w].size
            var filesizestr = WSC.utils.humanFileSize(results[w].size)
            var modifiedstr = WSC.utils.lastModifiedStr(results[w].modificationTime)
            if (! results[w].name.startsWith('.')) {
                if (rawname != 'wsc.htaccess' || this.app.opts.optDirListingHtaccess) {
                    html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>')
                }
            } else if (this.app.opts.optDotFilesDirListing) {
                html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>')
            }
        }
        this.setHeader('content-type','text/html; charset=utf-8')
        this.write(html.join('\n'))
        this.finish()
    },
    renderDirectoryListing: function(results) {
        var html = ['<html>']
        html.push('<style>li.directory {background:#aab}</style>')
        html.push('<a href="../?static=1">parent</a>')
        html.push('<ul>')
        results.sort( this.entriesSortFunc )
        
        // TODO -- add sorting (by query parameter?) show file size?

        for (var i=0; i<results.length; i++) {
            var name = results[i].name.htmlEscape()
            if (results[i].isDirectory) {
                if (! results[i].name.startsWith('.')) {
                    html.push('<li class="directory"><a href="' + name + '/?static=1">' + name + '</a></li>')
                }
            } else {
                if (! results[i].name.startsWith('.')) {
                    if (name != 'wsc.htaccess' || this.app.opts.optDirListingHtaccess) {
                        html.push('<li><a href="' + name + '?static=1">' + name + '</a></li>')
                    }
                } else if (this.app.opts.optDotFilesDirListing) {
                    html.push('<li><a href="' + name + '?static=1">' + name + '</a></li>')
                }
            }
        }
        html.push('</ul></html>')
        this.setHeader('content-type','text/html; charset=utf-8')
        this.write(html.join('\n'))
    },
    getDirContents: function(entry, callback) {
        entry.getDirContents(function(files) {
            callback(files)
        })
    },
    renderDirListing: function(results) {
        if (this.request.arguments && this.request.arguments.json == '1' || this.request.arguments.json == 'true' || (this.request.headers['accept'] && this.request.headers['accept'].toLowerCase() == 'application/json')) {
            this.renderDirectoryListingJSON(results)
        } else if (this.request.arguments && this.request.arguments.static == '1' || this.request.arguments.static == 'true') {
            this.renderDirectoryListing(results)
        } else if (this.request.arguments && this.request.arguments.staticjs == '1' || this.request.arguments.staticjs == 'true') {
            this.renderDirectoryListingStaticJs(results)
        } else if (this.request.arguments && this.request.arguments.js == '1' || this.request.arguments.js == 'true') {
            this.renderDirectoryListingTemplate(results)
        } else if (this.app.opts.optStatic) {
            this.renderDirectoryListing(results)
        } else if (this.app.opts.optStaticjs) {
            this.renderDirectoryListingStaticJs(results)
        } else {
            this.renderDirectoryListingTemplate(results)
        }
    },
    htaccessError: function(errormsg) {
        this.write('Htaccess Configuration error. Please check to make sure that you are not missing some values.\n\nError Message: '+errormsg, 500)
        this.finish()
        return
    },
    // everything from here to the end of the prototype are tools for server side post/get handling
    getFile: function(path, callback) {
        if (! path.startsWith('/')) {
            var path = WSC.utils.relativePath(path, WSC.utils.stripOffFile(this.request.origpath))
        }
        if (! callback) {
            return
        }
        this.fs.getByPath(path, function(entry) {
            callback(entry)
        }.bind(this))
    },
    getFilePromise: function(path) {
        return new Promise(function(resolve, reject) {
            this.getFile(path, resolve)
        }.bind(this))
    },
    writeFile: function(path, data, allowReplaceFile, callback) {
        if (! path.startsWith('/')) {
            var path = WSC.utils.relativePath(path, WSC.utils.stripOffFile(this.request.origpath))
        }
        if (! callback) {
            var callback = function(file) { }
        }
        this.fs.writeFile(path, data, callback, allowReplaceFile)
    },
    writeFilePromise: function(path, data, allowReplaceFile) {
        return new Promise(function(resolve, reject) {
            this.writeFile(path, data, allowReplaceFile, resolve)
        }.bind(this))
    },
    deleteFile: function(path, callback) {
        if (! path.startsWith('/')) {
            var path = WSC.utils.relativePath(path, WSC.utils.stripOffFile(this.request.origpath))
        }
        if (! callback) {
            var callback = function(file) { }
        }
        this.fs.getByPath(path, function(file) {
            if (file && ! file.error) {
                entry.remove(callback)
            } else {
                callback({error: file.error})
            }
        })
    },
    deleteFilePromise: function(path) {
        return new Promise(function(resolve, reject) {
            this.deleteFile(path, resolve)
        }.bind(this))
    },
    writeCode: function(code) {
        if (! code) {
            code = 200
        }
        this.responseLength = 0
        this.writeHeaders(code)
    },
    contentType: function(type) {
        var default_types = ['text/html',
                             'text/xml',
                             'text/plain',
                             "text/vnd.wap.wml",
                             "application/javascript",
                             "application/rss+xml"]
        if (type.split('chartset=').length != 1 && default_types.includes(type)) {
            var type = type + '; charset=utf-8'
        }
        this.setHeader('content-type', type)
    },
    end: function() {
        this.finish()
    },
    readBody: function(callback) {
        if (! callback) {
            var callback = function() { }
        }
        if (this.request.body !== null) {
            callback(this.request.body)
            return
        }
        if (this.request.consumedRequest) {
            this.request.body = Buffer.from('')
            callback(this.request.body)
            return
        }
        this.request.body = Buffer.from('')
        this.req.on('data', function(chunk) {
            if (chunk && chunk != 'undefined') {
                this.request.body = Buffer.concat([this.request.body, chunk])
            }
        }.bind(this))
        this.req.on('end', function() {
            this.request.consumedRequest = true
            callback(this.request.body)
        }.bind(this))
    },
    readBodyPromise: function() {
        return new Promise(function(resolve, reject) {
            this.readBody(resolve)
        }.bind(this))
    },
    stream2File: function(writePath, allowOverWrite, callback) {
        if (! path.startsWith('/')) {
            var path = WSC.utils.relativePath(path, WSC.utils.stripOffFile(this.request.origpath))
        }
        if (! callback) {
            var callback = function() { }
        }
        this.fs.getByPath(path, function(entry) {
            if (entry.error) {
                var file = this.fs.createWriteStream(path)
                file.on('error', function (err) {
                    callback({error: err})
                })
                this.req.pipe(file)
                this.req.on('end', function () {
                    this.request.consumedRequest = true
                    callback({error: false, success: true})
                }.bind(this))
            } else if (allowOverWrite) {
                entry.remove(function(e) {
                    if (e.error) {
                        callback({error: 'Unknown Error'})
                        return
                    }
                    var file = this.fs.createWriteStream(path)
                    file.on('error', function (err) {
                        callback({error: err})
                    })
                    this.req.pipe(file)
                    this.req.on('end', function () {
                        this.request.consumedRequest = true
                        callback({error: false, success: true})
                    }.bind(this))
                }.bind(this))
            } else {
                callback({error: 'File Already Exists'})
            }
        }.bind(this))
    }
}

for (var k in BaseHandler.prototype) {
    DirectoryEntryHandler.prototype[k] = BaseHandler.prototype[k]
}


module.exports = {DirectoryEntryHandler: DirectoryEntryHandler, BaseHandler: BaseHandler}

