
global.cachedFiles = [];
global.tempData = {};
global.ConnetionS = {};

function BaseHandler() {
    this.headersWritten = false;
    this.writingHeaders = false;
    this.responseCode = null;
    this.responseHeaders = {};
    this.responseLength = 0;
}
BaseHandler.prototype = {
    options: function() {
        if (this.app.opts.cors) {
            this.set_status(200);
            this.finish();
        } else {
            this.set_status(403);
            this.finish();
        }
    },
    error: async function(msg, httpCode) {
        var defaultMsg = '<h1>' + httpCode + ' - ' + WSC.HTTPRESPONSES[httpCode] + '</h1>\n\n<p>' + msg + '</p>';
        if (this.request.method == "HEAD") {
            this.responseLength = 0;
            this.writeHeaders(httpCode);
            this.finish();
            return;
        } else {
            this.setHeader('content-type','text/html; charset=utf-8');
            if (httpCode === 401) {
                this.setHeader("WWW-Authenticate", "Basic")
            }
            if (this.app.opts['custom'+httpCode] && typeof this.app.opts['custom'+httpCode] == 'string' && this.app.opts['custom'+httpCode].trim() !== '') {
                var file = await this.fs.asyncGetByPath(this.app.opts['custom'+httpCode]);
                if (!file.error && file.isFile) {
                    var data = await file.textPromise();
                    if (this.app.opts.customErrorReplaceString.trim() !== '') {
                        data = data.replaceAll(this.app.opts.customErrorReplaceString, this.request.origpath.htmlEscape());
                    }
                    this.write(data, httpCode);
                    this.finish();
                    return;
                }
            }
            this.write(defaultMsg, httpCode)
            this.finish();
        }
    },
    setCORS: function() {
        this.setHeader('access-control-allow-origin','*');
        this.setHeader('access-control-allow-methods','GET, POST, PUT, DELETE');
        this.setHeader('access-control-max-age','120');
    },
    get_argument: function(key,def) {
        if (this.request.arguments[key] !== undefined) {
            return this.request.arguments[key];
        } else {
            return def;
        }
    },
    getHeader: function(k,defaultvalue) {
        return this.request.headers[k] || defaultvalue;
    },
    setHeader: function(k,v) {
        this.responseHeaders[k] = v;
        this.res.setHeader(k, v);
    },
    set_status: function(code) {
        console.assert(! this.headersWritten);
        this.responseCode = code;
    },
    writeHeaders: function(code, callback) {
        if (code === undefined || isNaN(code)) { code = this.responseCode || 200 }
        if (code === 200) {
            this.res.statusCode = 200;
            this.res.statusMessage = 'OK';
        } else {
            this.res.statusCode = code;
            this.res.statusMessage = WSC.HTTPRESPONSES[code];
        }
        if (this.responseHeaders['transfer-encoding'] !== 'chunked') {
            console.assert(typeof this.responseLength == 'number');
            this.res.setHeader('content-length', this.responseLength);
        }

        var p = this.request.path.split('.');
        if (p.length > 1 && ! this.responseHeaders['content-type']) {
            var ext = p[p.length-1].toLowerCase();
            var type = WSC.MIMETYPES[ext];
            if (type) {
                var default_types = ['text/html',
                                     'text/xml',
                                     'text/plain',
                                     "text/vnd.wap.wml",
                                     "application/javascript",
                                     "application/rss+xml"]

                if (default_types.includes(type)) {
                    type += '; charset=utf-8';
                }
                this.setHeader('content-type',type);
            }
        }
        if (this.app.opts.cors) {
            this.setCORS();
        }
        if (callback && typeof callback == 'function') {
            callback();
        }
        this.headersWritten = true;
    },
    writeChunk: function(data) {
        if (! this.headersWritten) {
            this.writeHeaders()
        }
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        this.res.write(data)
    },
    write: function(data, code, opt_finish) {
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        var byteLength = data.byteLength;
        console.assert(byteLength !== undefined);
        if (code === undefined) { code = 200 };
        this.responseLength += byteLength;
        if (! this.headersWritten) {
            this.writeHeaders(code);
        }
        this.res.write(data)
        if (opt_finish !== false) {
            this.finish();
        }
    },
    finish: function() {
        global.ConnetionS[this.request.ip]--;
        if (! this.headersWritten) {
            this.writeHeaders();
        }
        this.res.end();
    }
}

function DirectoryEntryHandler(FileSystem, request, app, req, res) {
    this.headersWritten = false;
    this.responseCode = null;
    this.responseHeaders = {};
    this.responseLength = 0;
    this.htaccessName = '.swshtaccess';
    
    this.fs = FileSystem;
    this.req = req;
    this.res = res;
    this.app = app;
    this.request = request;
    this.entry = null;
    this.file = null;
}
DirectoryEntryHandler.prototype = {
    head: function() {
        this.get();
    },
    tryHandle: async function() {
        if (! this.request.ip) {
            this.error('', 403)
            return
        }
        if (! global.ConnetionS[this.request.ip] || global.ConnetionS[this.request.ip] < 0) {
            global.ConnetionS[this.request.ip] = 0
        }
        if (this.app.opts.ipThrottling && this.app.opts.ipThrottling !== 0 && global.ConnetionS[this.request.ip] > this.app.opts.ipThrottling) {
            this.error('', 429)
            return
        }
        global.ConnetionS[this.request.ip]++
        console.log(this.request.ip + ':', 'Request',this.request.method, this.request.uri)
        /*
        if (this.app.opts.optIpBlocking && this.app.opts.optIpBlockList) {
            var file = await this.fs.asyncGetByPath(this.app.opts.optIpBlockList)
            if (file && file.isFile && ! file.error) {
                var data = await file.textPromise()
                try {
                    var ipBlockList = JSON.parse(data)
                    if (ipBlockList.includes(this.request.ip)) {
                        this.error('', 403)
                        console.log('Blocked Request From ' + this.request.ip)
                        return
                    } else {
                        finished.bind(this)()
                    }
                } catch(e) {
                    console.log('Failed to parse Ip block list')
                }
            } else {
                console.log('Location of IP block list was not found')
            }
        }
        if (this.request.path === this.app.opts.optIpBlockList) {
            this.error('', 403)
            return
        }
        */
        var filename = this.request.path.split('/').pop();
        if (filename == this.htaccessName) {
            this.error('', 400);
            return;
        }
        if (this.app.opts.httpAuth) {
            var validAuth = false;
            var auth = this.request.headers['authorization'];
            if (auth) {
                if (auth.slice(0,6).toLowerCase() === 'basic ') {
                    var userpass = atob(auth.slice(6,auth.length)).split(':');
                    if (userpass[0] === this.app.opts.httpAuthUsername &&
                        userpass[1] === this.app.opts.httpAuthPassword) {
                        validAuth = true;
                    }
                }
            }
            if (! validAuth) {
                this.error("", 401);
                return;
            }
        }

        if (this.app.opts.spa) {
            if (!this.request.uri.match(/.*\.[\d\w]+$/)) {
                console.log("Single page rewrite rule matched", this.request.uri);
                this.rewrite_to = this.app.opts.rewriteTo || "/index.html";
            }
        }
        
        if (this[this.request.method.toLowerCase()]) {
            this[this.request.method.toLowerCase()]();
        } else {
            this.writeHeaders(501);
            this.finish();
        }
    },
    deletePutHtaccess: async function(allow, deny, callback, callbackSkip) {
        if (!this.app.opts.htaccess) {
            callback();
            return;
        }
        var fullrequestpath = this.request.origpath;
        var finpath = fullrequestpath.split('/').pop();
        var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length);
        if (this.request.path === '') {
            var finalpath = '/';
        }
        var htaccesspath = finalpath+this.htaccessName;
        var file = await this.fs.asyncGetByPath(htaccesspath)
        if (file.error) {
            callback();
            return;
        }
        var dataa = await file.textPromise();
        try {
            var origdata = JSON.parse(dataa);
        } catch(e) {
            console.warn('Htaccess JSON parse error', e, htaccessPath);
            this.responseLength = 0;
            this.writeHeaders(500);
            this.finish();
            return;
        }
        var filerequested = this.request.origpath.split('/').pop();
        var filefound = false;
        var auth = false;
        if (! Array.isArray(origdata)) {
            console.warn('is not an array', htaccessPath)
            callback();
            return
        }
        for (var i=0; i<origdata.length; i++) {
            if (! origdata[i].type) {
                this.htaccessError('missing type');
                return;
            }
            if (! origdata[i].request_path && origdata[i].type !== 'directory listing') {
                this.htaccessError('missing request path');
                return;
            }
            if (origdata[i].type === 403 && origdata[i].request_path === filerequested) {
                this.error('', 403);
                return;
            }
            if ((origdata[i].request_path === filerequested && origdata[i].type === 'POSTkey') ||
                (origdata[i].request_path === filerequested && origdata[i].type === 'serverSideJavaScript')) {
                this.error('', 400);
                return;
            }
            if (origdata[i].type === 401 &&
                ! auth &&
                (origdata[i].request_path === filerequested || origdata[i].request_path === 'all files')) {
                var authdata = origdata[i];
                var auth = true;
            }
            if ((origdata[i].type === allow && origdata[i].request_path === filerequested) ||
                (origdata[i].type === allow && origdata[i].request_path === 'all files') ||
                (origdata[i].type === deny && origdata[i].request_path === filerequested) ||
                (origdata[i].type === deny && origdata[i].request_path === 'all files') && ! filefound) {
                var data = origdata[i];
                var filefound = true;
            }
        }
        if (auth) {
            if (! authdata.username || !authdata.password) {
                this.htaccessError('missing Auth Username and/or password');
                return;
            }
            var validAuth = false;
            var auth = this.request.headers['authorization'];
            if (auth) {
                if (auth.slice(0,6).toLowerCase() === 'basic ') {
                    var userpass = atob(auth.slice(6,auth.length)).split(':');
                    if (userpass[0] === authdata.username && userpass[1] === authdata.password) {
                        validAuth = true;
                    }
                }
            }
            if (! validAuth) {
                this.error("", 401);
                return;
            }
        }
        if (!filefound) {
            callback();
            return;
        }
        if (data.type == allow) {
            callbackSkip();
        } else if (data.type == deny) {
            this.responseLength = 0;
            this.writeHeaders(400);
            this.finish();
            return;
        }
    },
    delete: function() {
        async function deleteMain() {
            var entry = await this.fs.asyncGetByPath(this.request.path);
            if (entry.error) {
                this.writeHeaders(404);
                this.finish();
                return;
            }
            var e = await entry.removePromise()
            if (e.error) {
                this.writeHeaders(500);
                this.finish();
                return;
            }
            this.writeHeaders(200);
            this.finish();
        }
        function deleteCheck() {
            if (! this.app.opts.delete) {
                this.responseLength = 0;
                this.writeHeaders(400);
                this.finish();
                return
            } else {
                deleteMain.bind(this)();
            }
        }
        this.deletePutHtaccess('allow delete', 'deny delete', deleteCheck.bind(this), deleteMain.bind(this))
    },
    post: async function() {
        var htaccessPath = WSC.utils.stripOffFile(this.request.origpath);
        var file = await this.fs.asyncGetByPath(htaccessPath+this.htaccessName);
        if (!file || file.error) {
            this.error('', 404);
            return;
        }
        var data = await file.textPromise();
        try {
            var origdata = JSON.parse(data);
        } catch(e) {
            console.warn('Htaccess JSON parse error', e, htaccessPath);
            this.error('', 500);
            this.finish();
            return;
        }
        if (! Array.isArray(origdata)) {
            console.warn('is not an array', htaccessPath);
            this.error('invalid config', 500);
            this.finish();
            return;
        }
        var filerequested = this.request.origpath.split('/').pop();
        var filefound = false;
        var auth = false;
        for (var i=0; i<origdata.length; i++) {
            if (! origdata[i].type) {
                this.htaccessError('missing type');
                return;
            }
            if (! origdata[i].request_path && origdata[i].type !== 'directory listing') {
                this.htaccessError('missing request path');
                return;
            }
            origdata[i].original_request_path = origdata[i].request_path;
            origdata[i].filerequested = filerequested;
            origdata[i].request_path = WSC.utils.htaccessFileRequested(origdata[i].request_path, this.app.opts.showIndex);
            if (origdata[i].type === 401 &&
                ! auth &&
                (origdata[i].request_path === filerequested || origdata[i].request_path === 'all files')) {
                var authdata = origdata[i];
                var auth = true;
            }
            if (origdata[i].type === 403 && origdata[i].request_path === filerequested) {
                this.error('', 403);
                return;
            }
            if (origdata[i].type === 'POSTkey' && ! filefound) {
                if (this.request.origpath.split('/').pop() === origdata[i].original_request_path || 
                        (origdata[i].original_request_path.split('/').pop() === 'index.html' && 
                        this.request.origpath.endsWith('/') &&
                        this.app.opts.showIndex) ||
                        (['html', 'htm'].includes(origdata[i].original_request_path.split('.').pop()) && 
                        origdata[i].original_request_path.split('/').pop().split('.')[0] === this.request.origpath.split('/').pop()) && 
                        this.app.opts.excludeDotHtml) {
                    var data = origdata[i];
                    var filefound = true;
                }
            }
        }
        // Still need to validate POST key
        if (auth) {
            if (!authdata.username || !authdata.password) {
                this.htaccessError('Missing auth username and/or password');
                return;
            }
            var validAuth = false;
            var auth = this.request.headers['authorization'];
            if (auth) {
                if (auth.slice(0,6).toLowerCase() === 'basic ') {
                    var userpass = atob(auth.slice(6,auth.length)).split(':');
                    if (userpass[0] === authdata.username && userpass[1] === authdata.password) {
                        validAuth = true;
                    }
                }
            }
            if (! validAuth) {
                this.error("", 401);
                return;
            }
        }
        if (!filefound) {
            this.error('', 404);
            return;
        }
        if (! data.key) {
            this.htaccessError('missing key');
            return;
        }
        var file = await this.fs.syncGetByPath(WSC.utils.stripOffFile(this.request.origpath)+data.original_request_path);
        if (!file || file.error || !file.isFile) {
            this.error('', 404);
            return;
        }
        var dataa = await file.textPromise();
        var contents = dataa;
        var validFile = false;
        var key = contents.replace(/ /g, '').split('postKey=');
        if (key.length > 1) {
            var key = key.pop();
            var key = key.substring(1, key.length).split('"')[0].split("'")[0];
            if (key == data.key) {
                var validFile = true;
            }
        }
        if (validFile) {
            var req = this.request;
            var res = this;
            var clearModuleCache = function() {
                for (var i=0; i<global.cachedFiles.length; i++) {
                    delete require.cache[require.resolve(global.cachedFiles[i])];
                }
                global.cachedFiles = [];
            }
            var requireFile = function(path) {
                var path = res.fs.mainPath + WSC.utils.relativePath(path, WSC.utils.stripOffFile(res.request.origpath));
                if (! global.cachedFiles.includes(path)) {
                    global.cachedFiles.push(path);
                }
                return require(path);
            }
            if (! global.tempData) {
                global.tempData = {};
            }
            try {
                eval('(function() {var handler = function(req, res, httpRequest, appInfo, clearModuleCache, requireFile) {\n' + dataa + '\n};handler(req, res, WSC.httpRequest, {"server": "Simple Web Server"}, clearModuleCache, requireFile)})();');
            } catch(e) {
                console.error(e);
                this.error('Check logs', 500);
                this.finish();
            }
        } else {
            consle.error('js keys missing!', htaccessPath + this.htaccessName);
            this.error('Script auth error', 403);
        }
    },
    put: function() {
        async function putMain() {
            var entry = await this.fs.asyncGetByPath(this.request.path)
            if (entry.error) {
                var file = this.fs.createWriteStream(this.request.origpath)
                file.on('error', function (err) {
                    console.error('error writing file', err);
                    this.writeHeaders(500);
                    this.finish();
                }.bind(this))
                this.req.pipe(file);
                this.req.on('end', function() {
                    this.writeHeaders(200);
                    this.finish();
                }.bind(this))
            } else if (this.app.opts.replace) {
                entry.remove(function(e) {
                    if (e.error) {
                        this.writeHeaders(500);
                        this.finish();
                    } else {
                        var file = this.fs.createWriteStream(this.request.origpath)
                        file.on('error', function(err) {
                            console.error('error writing file', err);
                            this.writeHeaders(500);
                            this.finish();
                        }.bind(this));
                        this.req.pipe(file);
                        this.req.on('end', function() {
                            this.writeHeaders(200);
                            this.finish();
                        }.bind(this))
                    }
                }.bind(this));
            } else {
                this.writeHeaders(400);
                this.finish();
            }
        }
        function putCheck() {
            if (! this.app.opts.upload) {
                this.responseLength = 0;
                this.writeHeaders(400);
                this.finish();
                return
            } else {
                putMain.bind(this)();
            }
        }
        this.deletePutHtaccess('allow put', 'deny put', putCheck.bind(this), putMain.bind(this));
    },
    get: function() {
        this.setHeader('accept-ranges', 'bytes');
        this.setHeader('connection', 'keep-alive');
        if (! this.fs) {
            this.error("need to select a directory to serve", 500);
            return;
        }
        this.request.isVersioning = false
        if (this.app.opts.cacheControl && typeof this.app.opts.cacheControl === 'string' && this.app.opts.cacheControl.trim() !== '') {
            this.setHeader('Cache-Control',this.app.opts.cacheControl)
        }
        if (this.app.opts.excludeDotHtml && ! this.request.origpath.endsWith("/") && this.request.path != '') {
            var extension = this.request.path.split('.').pop();
            var more = this.request.uri.split('.'+extension).pop();
            if (['htm', 'html'].includes(extension)) {
                var path = this.request.path;
                if (extension == 'html') {
                    var newpath = path.substring(0, path.length - 5);
                } else {
                    var newpath = path.substring(0, path.length - 4);
                }
                var newpath = newpath+more;
                this.responseLength = 0;
                this.setHeader('location', newpath);
                this.writeHeaders(307);
                this.finish();
                return;
            }
        }
        if (this.rewrite_to) {
            this.fs.getByPath(this.rewrite_to, this.onEntry.bind(this));
        } else {
            this.fs.getByPath(this.request.path, this.onEntry.bind(this));
        }
    },
    onEntry: async function(entry) {
        this.entry = entry;
        async function excludedothtmlcheck() {
            if (this.app.opts.excludeDotHtml && this.request.path != '' && ! this.request.origpath.endsWith("/")) {
                var file = await this.fs.asyncGetByPath(this.request.path+'.html');
                if (! file.error && file.isFile) {
                    this.setHeader('content-type','text/html; charset=utf-8');
                    this.renderFileContents(file);
                    return;
                }
                var file = await this.fs.asyncGetByPath(this.request.path+'.htm');
                if (! file.error && file.isFile) {
                    this.setHeader('content-type','text/html; charset=utf-8');
                    this.renderFileContents(file);
                    return;
                }
            }
            //Start main onEntry function
            if (this.entry && this.entry.isFile && this.request.origpath.endsWith('/') && this.request.path !== '') {
                this.setHeader('location', this.request.path);
                this.writeHeaders(301);
                this.finish();
                return;
            }
            if (this.entry && this.entry.isDirectory && ! this.request.origpath.endsWith('/')) {
                var newloc = this.request.origpath + '/';
                this.setHeader('location', newloc);
                this.responseLength = 0;
                this.writeHeaders(301);
                this.finish();
                return;
            }
            if (! this.entry) {
                this.error('no entry',404);
            } else if (this.entry.error) {
                if (this.entry.error.code == 'EPERM') {
                    this.error('', 403);
                } else {
                    this.error('entry not found: ' + (this.rewrite_to || this.request.path), 404);
                }
            } else if (this.entry.isFile) {
                this.renderFileContents(this.entry);
            } else {
                var results = await this.entry.getDirContentsPromise();
                if (this.app.opts.showIndex) {
                    for (var i=0; i<results.length; i++) {
                        if (['index.xhtml', 'index.xhtm'].includes(results[i].name.toLowerCase())) {
                            this.setHeader('content-type','application/xhtml+xml; charset=utf-8');
                            this.renderFileContents(results[i]);
                            return;
                        } else if (['index.htm', 'index.html'].includes(results[i].name.toLowerCase())) {
                            this.setHeader('content-type','text/html; charset=utf-8');
                            this.renderFileContents(results[i]);
                            return;
                        }
                    }
                }
                if (!this.app.opts.directoryListing) {
                    this.error("", 404);
                } else {
                    this.renderDirListing(results);
                }
            }
            //End main onEntry function
        }
    
        if (!this.app.opts.htaccess) {
            excludedothtmlcheck.bind(this)()
            return;
        }
        var fullrequestpath = this.request.origpath;
        var finpath = fullrequestpath.split('/').pop();
        var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length);
        if (this.request.path == '') {
            var finalpath = '/';
        }
        var htaccesspath = finalpath+this.htaccessName;
        var file = await this.fs.asyncGetByPath(htaccesspath);
        if (file.error || !file.isFile) {
            excludedothtmlcheck.bind(this)();
            return;
        }
        var dataa = await file.textPromise();
        try {
            var origdata = JSON.parse(dataa);
            if (! Array.isArray(origdata)) {
                throw new Error('not an array');
            }
        } catch(e) {
            console.error('config error', htaccesspath);
            this.error('', 500);
            this.finish();
            return;
        }
        async function htaccessMain(filerequested) {
            var filefound = false;
            var auth = false;
            var authdata = false;
            var j=0;
            var data = false;
            var htaccessHeaders = [];
            var additionalHeaders = false;
            var hasPost = false;
            if (origdata.length === 0 || !origdata.length) {
                excludedothtmlcheck.bind(this)();
                return;
            }
            for (var i=0; i<origdata.length; i++) {
                if (! origdata[i].type) {
                    this.htaccessError('missing type');
                    return;
                }
                if (! origdata[i].request_path && origdata[i].type !== 'directory listing') {
                    this.htaccessError('missing request path');
                    return;
                }
                origdata[i].original_request_path = origdata[i].request_path;
                origdata[i].filerequested = filerequested;
                origdata[i].request_path = WSC.utils.htaccessFileRequested(origdata[i].request_path, this.app.opts.showIndex);
                if (origdata[i].type === 401 &&
                    ! auth &&
                    (origdata[i].request_path === filerequested || origdata[i].request_path === 'all files') && ! this.request.isVersioning) {
                    var auth = true;
                    var authdata = origdata[i];
                }
                if (origdata[i].type === 'directory listing' &&
                    this.request.origpath.split('/').pop() === '' &&
                    ! filefound) {
                    data = origdata[i];
                    filefound = true;
                }
                if (origdata[i].type === 'send directory contents' && origdata[i].request_path === filerequested) {
                    var extension = origdata[i].original_request_path.split('.').pop();
                    if (['htm', 'html'].includes(extension)) {
                        data = origdata[i];
                        filefound = true;
                    }
                }
                if (origdata[i].type === 'serverSideJavaScript' && !filefound) {
                    if (this.request.origpath.split('/').pop() === origdata[i].original_request_path || 
                            (['html', 'htm'].includes(origdata[i].original_request_path.split('.').pop()) && 
                            origdata[i].original_request_path.split('/').pop().split('.')[0] === this.request.origpath.split('/').pop() &&
                            this.app.opts.excludeDotHtml) ||
                            (origdata[i].original_request_path.split('/').pop() === 'index.html' && 
                            this.request.origpath.endsWith('/') &&
                            this.app.opts.showIndex)) {
                        data = origdata[i];
                        filefound = true;
                    }
                }
                if ((origdata[i].request_path === filerequested || origdata[i].request_path === 'all files') && origdata[i].type === 'versioning' && !filefound && !this.request.isVersioning) {
                    data = origdata[i];
                    var filefound = true;
                }
                if ((origdata[i].request_path == filerequested || origdata[i].request_path == 'all files') &&
                    ! filefound &&
                    origdata[i].type !== 'allow delete' &&
                    origdata[i].type !== 'allow put' &&
                    origdata[i].type !== 'deny delete' &&
                    origdata[i].type !== 'deny put' &&
                    origdata[i].type !== 401 &&
                    origdata[i].type !== 'directory listing' &&
                    origdata[i].type !== 'additional header' &&
                    origdata[i].type !== 'send directory contents' &&
                    origdata[i].type !== 'POSTkey' &&
                    origdata[i].type !== 'serverSideJavaScript' &&
                    origdata[i].type !== 'versioning') {
                        data = origdata[i];
                        filefound = true;
                }
                if (this.request.origpath.split('/').pop() === origdata[i].original_request_path && origdata[i].type === 'POSTkey') {
                    var hasPost = true;
                }
                //console.log(origdata[i].request_path === filerequested);
                if ((origdata[i].request_path === filerequested || origdata[i].request_path === 'all files') &&
                    origdata[i].type === 'additional header') {
                    additionalHeaders = true;
                    htaccessHeaders[j] = origdata[i];
                    j++;
                }
            }
            //console.log(data);
            //console.log(authdata);
            //console.log(filefound);
            if (hasPost && data.type !== 'serverSideJavaScript') {
                this.error('', 400);
                return;
            }
            async function htaccessCheck2(data) {
                if (!filefound) {
                    excludedothtmlcheck.bind(this)();
                    return;
                }
                if ([301, 302, 307].includes(data.type)) {
                    if (! data.redirto) {
                        this.htaccessError('missing redirect location');
                        return;
                    }
                    this.setHeader('location', data.redirto);
                    this.responseLength = 0;
                    this.writeHeaders(data.type);
                    this.finish();
                } else if (data.type === 'denyDirectAccess') {
                    var method = this.request.headers['sec-fetch-dest'];
                    //console.log(method)
                    if (method === "document") {
                        this.error('', 403);
                    } else {
                        excludedothtmlcheck.bind(this)();
                    }
                } else if (data.type === 403) {
                    this.error('', 403);
                } else if (data.type === 'directory listing') {
                    this.getDirContents(entry, this.renderDirListing.bind(this));
                } else if (data.type === 'send directory contents') {
                    if (! data.dir_to_send || data.dir_to_send.replace(' ', '') === '') {
                        data.dir_to_send = './';
                    }
                    var path2Send = data.dir_to_send;
                    var fullrequestpath = this.request.origpath;
                    var finpath = fullrequestpath.split('/').pop();
                    var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length);
                    if (this.request.path == '') {
                        var finalpath = '/';
                    }
                    var split1 = finalpath.split('/');
                    var split2 = path2Send.split('/');
                    
                    if (! path2Send.startsWith('/')) {
                        for (var w=0; w<split2.length; w++) {
                            if (split2[w] === '' || split2[w] === '.') {
                                // . means current directory. Leave this here for spacing
                            } else if (split2[w] === '..') {
                                if (split1.length > 0) {
                                    var split1 = WSC.utils.stripOffFile(split1.join('/')).split('/');
                                }
                            } else {
                                split1.push(split2[w]);
                            }
                        }
                        var path2Send = split1.join('/');
                        if (! path2Send.startsWith('/')) {
                            var path2Send = '/' + path2Send;
                        }
                    }
                    var entryy = await this.fs.asyncGetByPath(path2Send);
                    if (entry.error || entry.isDirectory) {
                        this.htaccessError('invalid path to send dir contents');
                        return;
                    }
                    var results = await entryy.getDirContentsPromise();
                    var fullrequestpath = this.request.origpath;
                    var finpath = fullrequestpath.split('/').pop();
                    var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length) + data.original_request_path;
                    var file = await this.fs.asyncGetByPath(finalpath);
                    if (file.error || !file.isFile) {
                        this.error('', 500);
                        this.finish();
                        return;
                    }
                    var data = await file.textPromise();
                    var html = [dataa];
                    for (var w=0; w<results.length; w++) {
                        var rawname = results[w].name;
                        var name = encodeURIComponent(results[w].name);
                        var isdirectory = results[w].isDirectory;
                        var modified = WSC.utils.lastModified(results[w].modificationTime);
                        var filesize = results[w].size;
                        var filesizestr = WSC.utils.humanFileSize(results[w].size);
                        var modifiedstr = WSC.utils.lastModifiedStr(results[w].modificationTime);
                        if (! results[w].hidden || (this.app.opts.hiddenDotFiles && this.app.opts.hiddenDotFilesDirectoryListing)) {
                            html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>');
                        }
                    }
                    this.setHeader('content-type','text/html; charset=utf-8');
                    this.write(html.join('\n'));
                    this.finish();
                } else if (data.type === 'versioning') {
                    //console.log('versioning')
                    if (! data.version_data || data.version_data.length === 0) {
                        this.htaccessError('missing version data');
                        return;
                    }
                    if (! data.variable) {
                        this.htaccessError('missing variable');
                        return;
                    }
                    if (! data.default) {
                        this.htaccessError('missing default file selection');
                        return;
                    }
                    var versionData = data.version_data;
                    var vdata4 = this.request.arguments[data.variable];
                    if ( ! versionData[vdata4]) {
                        vdata4 = data.default;
                    }
                    var vdataa = versionData[vdata4];
                    var fullrequestpath = this.request.origpath;
                    var finpath = fullrequestpath.split('/').pop();
                    var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length);
                    if (this.request.path == '') {
                        var finalpath = '/';
                    }
                    var split1 = finalpath.split('/');
                    var split2 = vdataa.split('/');
                    if (! vdataa.startsWith('/')) {
                        for (var w=0; w<split2.length; w++) {
                            if (split2[w] == '' || split2[w] == '.') {
                                // . means current directory. Leave this here for spacing
                            } else if (split2[w] == '..') {
                                if (split1.length > 0) {
                                    var split1 = WSC.utils.stripOffFile(split1.join('/')).split('/');
                                }
                            } else {
                                split1.push(split2[w]);
                            }
                        }
                        var vdataa = split1.join('/');
                        if (! vdataa.startsWith('/')) {
                            var vdataa = '/' + vdataa;
                        }
                    }
                    //console.log(vdataa)
                    var file = await this.fs.asyncGetByPath(vdataa);
                    if (file && ! file.error) {
                        this.request.path = vdataa;
                        if (file.isFile) {
                            this.request.origpath = vdataa;
                            this.request.uri = vdataa;
                        } else {
                            if (vdataa.endsWith("/")) {
                                this.request.origpath = vdataa;
                                this.request.uri = vdataa;
                            } else {
                                this.request.origpath = vdataa+'/';
                                this.request.uri = vdataa+'/';
                            }
                        }
                        this.request.isVersioning = true;
                        this.onEntry(file);
                    } else {
                        console.warn('path in htaccess file for version '+vdata4+' is missing or the file does not exist. Please check to make sure you have properly inputed the value', this.request.path);
                        this.error('', 500);
                    }
                } else if (data.type === 'serverSideJavaScript') {
                    if (! data.key) {
                        this.htaccessError('missing key');
                        return;
                    }
                    var file = await this.fs.asyncGetByPath(WSC.utils.stripOffFile(this.request.origpath) + data.original_request_path);
                    if (file && ! file.error && file.isFile) {
                        var dataa = await file.textPromise();
                        var contents = dataa;
                        var validFile = false;
                        var key = contents.replace(/ /g, '').split('SSJSKey=');
                        if (key.length > 1) {
                            var key = key.pop();
                            var key = key.substring(1, key.length).split('"')[0].split("'")[0];
                            if (key == data.key) {
                                var validFile = true;
                            }
                        }
                        if (validFile) {
                            var req = this.request;
                            var res = this;
                            var clearModuleCache = function() {
                                for (var i=0; i<global.cachedFiles.length; i++) {
                                    delete require.cache[require.resolve(global.cachedFiles[i])];
                                }
                                global.cachedFiles = [];
                            }
                            var requireFile = function(path) {
                                var path = res.fs.mainPath + WSC.utils.relativePath(path, WSC.utils.stripOffFile(res.request.origpath));
                                if (! global.cachedFiles.includes(path)) {
                                    global.cachedFiles.push(path);
                                }
                                return require(path);
                            }
                            if (! global.tempData) {
                                global.tempData = {};
                            }
                            try {
                                eval('(function() {var handler = function(req, res, httpRequest, appInfo, clearModuleCache, requireFile) {' + dataa + '};handler(req, res, WSC.httpRequest, {"server": "Simple Web Server"}, clearModuleCache, requireFile)})();');
                            } catch(e) {
                                console.error(e);
                                this.error('', 500);
                                this.finish();
                            }
                        } else {
                            this.error('Script auth error', 403);
                        }
                    } else if (file.isDirectory) {
                        this.error('error', 500);
                    } else {
                        this.error('', 404);
                    }
                } else {
                    excludedothtmlcheck.bind(this)();
                }
            }
            //console.log(htaccessHeaders)
            if (additionalHeaders) {
                for (var i=0; i<htaccessHeaders.length; i++) {
                    this.setHeader(htaccessHeaders[i].headerType, htaccessHeaders[i].headerValue);
                }
            }
            if (!auth || authdata.type !== 401) {
                htaccessCheck2.bind(this)(data);
                return;
            }
            if (!authdata.username || !authdata.password) {
                this.htaccessError('Missing auth username and/or password');
                return;
            }
            var validAuth = false;
            var auth = this.request.headers['authorization'];
            if (auth) {
                if (auth.slice(0,6).toLowerCase() == 'basic ') {
                    var userpass = atob(auth.slice(6,auth.length)).split(':');
                    if (userpass[0] == authdata.username && userpass[1] == authdata.password) {
                        validAuth = true;
                    }
                }
            }
            if (! validAuth) {
                this.error("", 401);
            } else {
                htaccessCheck2.bind(this)(data);
            }
        }
        var filerequest = this.request.origpath;
        if (this.app.opts.excludeDotHtml) {
            var file = await this.fs.asyncGetByPath(this.request.path+'.html');
            if (! file.error) {
                if (this.request.origpath.endsWith("/")) {
                    htaccessMain.bind(this)('');
                    return;
                }
                var filerequested = this.request.path+'.html';
                var filerequested = filerequested.split('/').pop();
                var filerequested = WSC.utils.htaccessFileRequested(filerequested, this.app.opts.showIndex);
                htaccessMain.bind(this)(filerequested);
                return;
            }
            var file = await this.fs.asyncGetByPath(this.request.path+'.htm');
            if (! file.error) {
                if (this.request.origpath.endsWith("/")) {
                    htaccessMain.bind(this)('');
                    return;
                }
                var filerequested = this.request.path+'.htm';
                var filerequested = filerequested.split('/').pop();
                var filerequested = WSC.utils.htaccessFileRequested(filerequested, this.app.opts.showIndex);
                htaccessMain.bind(this)(filerequested);
                return;
            }
        }
        if (this.entry && this.entry.isDirectory && ! this.request.origpath.endsWith('/')) {
            var newloc = this.request.origpath + '/';
            this.setHeader('location', newloc);
            this.responseLength = 0;
            this.writeHeaders(301);
            this.finish();
            return;
        }
        var filerequested = filerequest.split('/').pop();
        var filerequested = WSC.utils.htaccessFileRequested(filerequested, this.app.opts.showIndex);
        htaccessMain.bind(this)(filerequested);
        return;
    },
    renderFileContents: function(entry) {
        if (! entry.path) {
            this.error('', 404);
            return;
        }
        if (entry.hidden && ! this.app.opts.hiddenDotFiles) {
            this.error('', 404);
            return;
        }
        global.ConnetionS[this.request.ip]--;
        if (this.request.method === 'HEAD') {
            this.responseLength = entry.size;
            this.writeHeaders(200);
            this.finish();
        } else {
            if (entry.size === 0) {
                this.responseLength = entry.size;
                this.writeHeaders(200);
                this.write('');
                this.finish();
                return
            }
            var fileOffset, fileEndOffset, code;
            if (this.request.headers['range']) {
                //console.log('range request')
                var range = this.request.headers['range'].split('=')[1].trim();
                var rparts = range.split('-');
                fileOffset = parseInt(rparts[0]);
                if (! rparts[1]) {
                    var fileEndOffset = entry.size - 1;
                    this.responseLength = entry.size-fileOffset;
                    this.setHeader('content-range','bytes '+fileOffset+'-'+(entry.size-1)+'/'+entry.size);
                    code = (fileOffset === 0) ? 200 : 206;
                } else {
                    fileEndOffset = parseInt(rparts[1])
                    this.responseLength = fileEndOffset - fileOffset + 1;
                    this.setHeader('content-range','bytes '+fileOffset+'-'+(fileEndOffset)+'/'+entry.size);
                    code = 206;
                }
            } else {
                fileOffset = 0;
                fileEndOffset = entry.size - 1;
                this.responseLength = entry.size;
                code = 200;
            }
            var compression = false;
            var stream = this.fs.createReadStream(entry.fullPath, {start: fileOffset,end: fileEndOffset});
            if (this.request.headers['accept-encoding'] && this.app.opts.compression) {
                var ac = this.request.headers['accept-encoding'];
                if (ac.includes('br') || ac.includes('gzip') || ac.includes('deflate')) {
                    compression = true;
                    var compresionStream;
                    if (ac.includes('gzip')) {
                        this.setHeader('Content-Encoding', 'gzip');
                        compresionStream = zlib.createGzip();
                    } else if (ac.includes('br')) {
                        this.setHeader('Content-Encoding', 'br');
                        compresionStream = zlib.createBrotliCompress();
                    } else if (ac.includes('deflate')) {
                        this.setHeader('Content-Encoding', 'deflate');
                        compresionStream = zlib.createDeflate();
                    } else {
                        console.log('this.. shouldnt be possible');
                        this.res.end();
                        return;
                    }
                    pipeline(stream, compresionStream, this.res, function(err) {if (err) {console.warn('Compression Error:', err); this.res.end()}}.bind(this))
                }
            }
            this.writeHeaders(code);
            if (! compression) {
                stream.pipe(this.res);
                stream.on('finish', function() {
                    stream.close();
                })
                this.req.on("close", function() {
                    stream.close();
                })
            }
        }
    },
    entriesSortFunc: function(a,b) {
        var anl = a.name.toLowerCase();
        var bnl = b.name.toLowerCase();
        if (a.isDirectory && b.isDirectory) {
            return anl.localeCompare(bnl);
        } else if (a.isDirectory) {
            return -1;
        } else if (b.isDirectory) {
            return 1;
        } else {
            // both files
            return anl.localeCompare(bnl);
        }
            
    },
    renderDirectoryListingJSON: function(origResults) {
        this.setHeader('content-type','application/json; charset=utf-8');
        var results = [];
        for (var i=0; i<origResults.length; i++) {
            if (! origResults[i].hidden || (this.app.opts.hiddenDotFiles && this.app.opts.hiddenDotFilesDirectoryListing)) {
                results.push(origResults[i]);
            }
        }
        this.write(JSON.stringify(results.map(function(f) { return { name:f.name,
                                                                     fullPath:f.fullPath,
                                                                     isFile:f.isFile,
                                                                     isDirectory:f.isDirectory }
                                                          }), null, 2));
    },
    renderDirectoryListingStaticJs: function(results) {
        if (! WSC.static_template_data) {
            return this.renderDirectoryListing(results)
        }
        var html = ['<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="google" value="notranslate"><title id="title"></title></head>'];
        html.push('<noscript><style>li.directory {background:#aab}</style><a href="../?static=1">parent</a><ul>');
        results.sort(this.entriesSortFunc);
        for (var i=0; i<results.length; i++) {
            var name = results[i].name.htmlEscape();
            if (results[i].isDirectory) {
                if (! results[i].hidden || (this.app.opts.hiddenDotFiles && this.app.opts.hiddenDotFilesDirectoryListing)) {
                    html.push('<li class="directory"><a href="' + name + '/?static=1">' + name + '</a></li>');
                }
            } else {
                if (! results[i].hidden || (this.app.opts.hiddenDotFiles && this.app.opts.hiddenDotFilesDirectoryListing)) {
                    html.push('<li><a href="' + name + '?static=1">' + name + '</a></li>');
                }
            }
        }
        html.push('</ul></noscript>');
        html.push('<div style="display:none;" id="javascriptDirectoryListing">');
        html.push(WSC.static_template_data);
        html.push('<script>start("'+this.request.origpath+'")</script>');
        if (this.request.origpath != '/') {
            html.push('<script>onHasParentDirectory();</script>');
        }
        for (var w=0; w<results.length; w++) {
            var rawname = results[w].name;
            var name = encodeURIComponent(results[w].name);
            var isdirectory = results[w].isDirectory;
            var modified = WSC.utils.lastModified(results[w].modificationTime);
            var filesize = results[w].size;
            var filesizestr = WSC.utils.humanFileSize(results[w].size);
            var modifiedstr = WSC.utils.lastModifiedStr(results[w].modificationTime);
            if (! results[w].hidden || (this.app.opts.hiddenDotFiles && this.app.opts.hiddenDotFilesDirectoryListing)) {
                html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>');
            }
        }
        html.push('</div>');
        html.push('<script>document.getElementById("javascriptDirectoryListing").style = "display:block;"</script>');
        html.push('</body></html>');
        
        this.setHeader('content-type','text/html; charset=utf-8');
        this.write(html.join('\n'));
        this.finish();
    },
    renderDirectoryListingTemplate: function(results) {
        if (! WSC.template_data) {
            return this.renderDirectoryListing(results);
        }
        var html = [WSC.template_data];
        html.push('<script>start("'+this.request.origpath+'")</script>');
        if (this.request.origpath != '/') {
            html.push('<script>onHasParentDirectory();</script>');
        }
        for (var w=0; w<results.length; w++) {
            var rawname = results[w].name;
            var name = encodeURIComponent(results[w].name);
            var isdirectory = results[w].isDirectory;
            var modified = WSC.utils.lastModified(results[w].modificationTime);
            var filesize = results[w].size;
            var filesizestr = WSC.utils.humanFileSize(results[w].size);
            var modifiedstr = WSC.utils.lastModifiedStr(results[w].modificationTime);
            if (! results[w].hidden || (this.app.opts.hiddenDotFiles && this.app.opts.hiddenDotFilesDirectoryListing)) {
                html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>');
            }
        }
        this.setHeader('content-type','text/html; charset=utf-8');
        this.write(html.join('\n'));
        this.finish();
    },
    renderDirectoryListing: function(results) {
        var html = ['<html>'];
        html.push('<style>li.directory {background:#aab}</style>');
        html.push('<a href="../?static=1">parent</a>');
        html.push('<ul>');
        results.sort(this.entriesSortFunc);
        for (var i=0; i<results.length; i++) {
            var name = results[i].name.htmlEscape();
            if (results[i].isDirectory) {
                if (! results[i].hidden || (this.app.opts.hiddenDotFiles && this.app.opts.hiddenDotFilesDirectoryListing)) {
                    html.push('<li class="directory"><a href="' + name + '/?static=1">' + name + '</a></li>');
                }
            } else {
                if (! results[i].hidden || (this.app.opts.hiddenDotFiles && this.app.opts.hiddenDotFilesDirectoryListing)) {
                    html.push('<li><a href="' + name + '?static=1">' + name + '</a></li>');
                }
            }
        }
        html.push('</ul></html>');
        this.setHeader('content-type','text/html; charset=utf-8');
        this.write(html.join('\n'));
    },
    getDirContents: function(entry, callback) {
        entry.getDirContents(callback);
    },
    renderDirListing: function(results) {
        if (this.request.arguments && ['1','true'].includes(this.request.arguments.json) || (this.request.headers['accept'] && this.request.headers['accept'].toLowerCase() == 'application/json')) {
            this.renderDirectoryListingJSON(results);
        } else if (this.request.arguments && ['1','true'].includes(this.request.arguments.static)) {
            this.renderDirectoryListing(results);
        } else if (this.request.arguments && ['1','true'].includes(this.request.arguments.staticjs)) {
            this.renderDirectoryListingStaticJs(results);
        } else if (this.request.arguments && ['1','true'].includes(this.request.arguments.js)) {
            this.renderDirectoryListingTemplate(results);
        } else if (this.app.opts.staticDirectoryListing) {
            this.renderDirectoryListing(results);
        } else {
            this.renderDirectoryListingStaticJs(results);
        }
    },
    htaccessError: function(errormsg) {
        this.error('config error', 500);
        console.warn('htaccess error: ' + errormsg);
    },
    // everything from here to the end of the prototype are tools for server side post/get handling
    getFile: function(path, callback) {
        if (! path.startsWith('/')) {
            var path = WSC.utils.relativePath(path, WSC.utils.stripOffFile(this.request.origpath));
        }
        if (! callback) {
            return;
        }
        this.fs.getByPath(path, function(entry) {
            callback(entry);
        }.bind(this))
    },
    getFilePromise: function(path) {
        return new Promise(function(resolve, reject) {
            this.getFile(path, resolve);
        }.bind(this))
    },
    writeFile: function(path, data, allowReplaceFile, callback) {
        if (! path.startsWith('/')) {
            var path = WSC.utils.relativePath(path, WSC.utils.stripOffFile(this.request.origpath));
        }
        if (! callback) {
            callback = function(file) {};
        }
        this.fs.writeFile(path, data, callback, allowReplaceFile);
    },
    writeFilePromise: function(path, data, allowReplaceFile) {
        return new Promise(function(resolve, reject) {
            this.writeFile(path, data, allowReplaceFile, resolve);
        }.bind(this))
    },
    deleteFile: function(path, callback) {
        if (! path.startsWith('/')) {
            var path = WSC.utils.relativePath(path, WSC.utils.stripOffFile(this.request.origpath));
        }
        if (! callback) {
            callback = function(file) {};
        }
        this.fs.getByPath(path, function(file) {
            if (file && ! file.error) {
                entry.remove(callback);
            } else {
                callback({error: file.error});
            }
        })
    },
    deleteFilePromise: function(path) {
        return new Promise(function(resolve, reject) {
            this.deleteFile(path, resolve);
        }.bind(this))
    },
    writeCode: function(code) {
        if (! code) {
            code = 200;
        }
        this.responseLength = 0;
        this.writeHeaders(code);
    },
    contentType: function(type) {
        var default_types = ['text/html',
                             'text/xml',
                             'text/plain',
                             "text/vnd.wap.wml",
                             "application/javascript",
                             "application/rss+xml"]
        if (type.split('chartset=').length != 1 && default_types.includes(type)) {
            var type = type + '; charset=utf-8';
        }
        this.setHeader('content-type', type);
    },
    end: function() {
        this.finish();
    },
    readBody: function(callback) {
        if (! callback) {
            callback = function() {};
        }
        if (this.request.body !== null) {
            callback(this.request.body);
            return;
        }
        if (this.request.consumedRequest) {
            this.request.body = Buffer.from('');
            callback(this.request.body);
            return;
        }
        this.request.body = Buffer.from('');
        this.req.on('data', function(chunk) {
            if (chunk && chunk != 'undefined') {
                this.request.body = Buffer.concat([this.request.body, chunk]);
            }
        }.bind(this));
        this.req.on('end', function() {
            this.request.consumedRequest = true;
            callback(this.request.body);
        }.bind(this))
    },
    readBodyPromise: function() {
        return new Promise(function(resolve, reject) {
            this.readBody(resolve);
        }.bind(this))
    },
    stream2File: function(writePath, allowOverWrite, callback) {
        if (! path.startsWith('/')) {
            var path = WSC.utils.relativePath(path, WSC.utils.stripOffFile(this.request.origpath));
        }
        if (! callback) {
            callback = function() {};
        }
        if (this.request.consumedRequest && this.request.body !== null) {
            this.fs.writeFile(path, this.request.body, callback, allowOverWrite);
            return;
        } else if (this.request.consumedRequest) {
            callback({error: 'request body already consumed'});
            return;
        }
        this.fs.getByPath(path, function(entry) {
            if (entry.error) {
                var file = this.fs.createWriteStream(path);
                file.on('error', function (err) {
                    callback({error: err});
                })
                this.req.pipe(file);
                this.req.on('end', function () {
                    this.request.consumedRequest = true;
                    callback({error: false, success: true});
                }.bind(this));
            } else if (allowOverWrite) {
                entry.remove(function(e) {
                    if (e.error) {
                        callback({error: 'Unknown Error'});
                        return;
                    }
                    var file = this.fs.createWriteStream(path);
                    file.on('error', function (err) {
                        callback({error: err});
                    })
                    this.req.pipe(file);
                    this.req.on('end', function () {
                        this.request.consumedRequest = true;
                        callback({error: false, success: true});
                    }.bind(this));
                }.bind(this));
            } else {
                callback({error: 'File Already Exists'});
            }
        }.bind(this));
    }
}

for (var k in BaseHandler.prototype) {
    DirectoryEntryHandler.prototype[k] = BaseHandler.prototype[k];
}

module.exports = {DirectoryEntryHandler: DirectoryEntryHandler, BaseHandler: BaseHandler};
