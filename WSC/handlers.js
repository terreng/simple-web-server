global.cachedFiles = [];
global.tempData = {};
global.ConnetionS = {};//This shouldnt be done this way

class DirectoryEntryHandler {
    headersWritten;
    responseCode;
    responseHeaders;
    responseLength;
    htaccessName;
    fs;
    req;
    res;
    opts;
    request;
    entry;
    file;
    constructor(FileSystem, request, app, req, res) {
        this.headersWritten = false;
        this.responseCode = null;
        this.responseHeaders = {};
        this.responseLength = 0;
        this.htaccessName = '.swshtaccess';
        this.fs = FileSystem;
        this.req = req;
        this.res = res;
        this.opts = app;
        this.request = request;
        this.entry = null;
        this.file = null;
    }
    // Start Base Handler
    options() {
        if (this.opts.cors) {
            this.set_status(200);
            this.finish();
        } else {
            this.set_status(403);
            this.finish();
        }
    }
    error(msg, httpCode) {
        const defaultMsg = '<h1>' + httpCode + ' - ' + WSC.HTTPRESPONSES[httpCode] + '</h1>\n\n<p>' + msg + '</p>';
        if (httpCode === 401) {
            this.setHeader("WWW-Authenticate", "Basic");
        }
        if (this.request.method === "HEAD") {
            this.responseLength = 0;
            this.writeHeaders(httpCode);
            this.finish();
            return;
        } else {
            this.setHeader('content-type','text/html; charset=utf-8');
            if (typeof this.opts['custom'+httpCode] === 'string' && this.opts['custom'+httpCode].trim() !== '') {
                const file = this.fs.getByPath(this.opts['custom'+httpCode]);
                if (!file.error && file.isFile) {
                    let data = file.text();
                    if (typeof this.opts.customErrorReplaceString === 'string' && this.opts.customErrorReplaceString.trim() !== '') {
                        data = data.replaceAll(this.opts.customErrorReplaceString, this.request.origpath.htmlEscape());
                    }
                    this.write(data, httpCode);
                    this.finish();
                    return;
                }
            }
            this.write(defaultMsg, httpCode);
            this.finish();
        }
    }
    setCORS() {
        this.setHeader('access-control-allow-origin','*');
        this.setHeader('access-control-allow-methods','GET, POST, PUT, DELETE');
        this.setHeader('access-control-max-age','120');
    }
    get_argument(k, def) {
        return this.request.arguments[k] || def;
    }
    getHeader(k, defaultvalue) {
        return this.request.headers[k] || defaultvalue;
    }
    setHeader(k, v) {
        this.responseHeaders[k] = v;
        this.res.setHeader(k, v);
    }
    set_status(code) {
        console.assert(!this.headersWritten);
        this.responseCode = code;
    }
    writeHeaders(code) {
        console.assert(!this.headersWritten);
        if (code === undefined || isNaN(code)) { code = this.responseCode || 200 };
        this.res.statusCode = code
        this.res.statusMessage = WSC.HTTPRESPONSES[code];
        if (this.responseHeaders['transfer-encoding'] !== 'chunked') {
            console.assert(typeof this.responseLength === 'number');
            this.res.setHeader('content-length', this.responseLength);
        }
        const p = this.request.path.split('.');
        if (p.length > 1 && ! this.responseHeaders['content-type']) {
            const ext = p[p.length-1].toLowerCase();
            let type = WSC.MIMETYPES[ext];
            if (type) {
                const default_types = ['text/html',
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
        if (this.opts.cors) {
            this.setCORS();
        }
        this.headersWritten = true;
    }
    writeChunk(data) {
        if (!this.headersWritten) this.writeHeaders();
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        this.res.write(data);
    }
    write(data, code, opt_finish) {
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        const byteLength = data.byteLength;
        console.assert(byteLength !== undefined);
        if (code === undefined) { code = 200 };
        this.responseLength += byteLength;
        if (!this.headersWritten) this.writeHeaders(code);
        this.res.write(data);
        if (opt_finish !== false) this.finish();
    }
    finish() {
        global.ConnetionS[this.request.ip]--;
        if (! this.headersWritten) {
            this.writeHeaders();
        }
        this.res.end();
    }
    // End Base Handler
    head() {
        this.get();
    }
    tryHandle() {
        if (!this.request.ip) {
            this.error('', 403);
            return;
        }
        //This needs to be re-done
        if (!global.ConnetionS[this.request.ip] || global.ConnetionS[this.request.ip] < 0) {
            global.ConnetionS[this.request.ip] = 0;
        }
        if (this.opts.ipThrottling && this.opts.ipThrottling !== 0 && global.ConnetionS[this.request.ip] > this.opts.ipThrottling) {
            this.error('', 429);
            return;
        }
        global.ConnetionS[this.request.ip]++;

        console.log("["+(new Date()).toLocaleString()+"]", this.request.ip + ':', 'Request',this.request.method, this.request.uri);
        const filename = this.request.path.split('/').pop();
        if (filename === this.htaccessName) {
            this.error('', 400);
            return;
        }
        if (this.opts.httpAuth) {
            let validAuth = false;
            const auth = this.request.headers['authorization'];
            if (auth) {
                if (auth.slice(0,6).toLowerCase() === 'basic ') {
                    const userpass = atob(auth.slice(6,auth.length)).split(':');
                    if (userpass[0] === this.opts.httpAuthUsername &&
                        userpass[1] === this.opts.httpAuthPassword) {
                        validAuth = true;
                    }
                }
            }
            if (!validAuth) {
                this.error("", 401);
                return;
            }
        }

        if (this.opts.spa && !this.request.uri.match(/.*\.[\d\w]+$/)) {
            this.rewrite_to = this.opts.rewriteTo || "/index.html";
        }

        if (this[this.request.method.toLowerCase()]) {
            try {
                const a = this[this.request.method.toLowerCase()]();
                if (a && typeof a.catch === 'function') {
                    a.catch((e) => {
                        this.error("Something went wrong", 500);
                        if (e) console.warn('error: ', e);
                    })
                }
            } catch(e) {
                if (e) console.warn('Error: ', e);
                this.error("Something went wrong", 500);
            }
        } else {
            this.writeHeaders(501);
            this.finish();
        }
    }
    deletePutHtaccess(allow, deny, callback, callbackSkip) {
        if (!this.opts.htaccess) {
            callback();
            return;
        }
        const finalpath = WSC.utils.stripOffFile(this.request.origpath);
        const htaccesspath = finalpath+this.htaccessName;
        let file = this.fs.getByPath(htaccesspath);
        if (file.error) {
            callback();
            return;
        }
        const dataa = file.text();
        let origdata;
        try {
            origdata = JSON.parse(dataa);
        } catch(e) {
            console.error('Htaccess JSON parse error', e, htaccesspath);
            this.responseLength = 0;
            this.writeHeaders(500);
            this.finish();
            return;
        }
        const filerequested = this.request.origpath.split('/').pop();
        const filefound = false;
        let auth = false;
        let authdata;
        let data;
        if (!Array.isArray(origdata)) {
            console.error('Is not an array', htaccesspath)
            callback();
            return;
        }
        for (let i=0; i<origdata.length; i++) {
            if (! origdata[i].type) {
                this.htaccessError('Missing Type');
                return;
            }
            if (! origdata[i].request_path && origdata[i].type !== 'directory listing') {
                this.htaccessError('Missing Request Path');
                return;
            }
            if (origdata[i].type === 403 && origdata[i].request_path === filerequested) {
                this.error('', 403);
                return;
            }
            if (origdata[i].request_path === filerequested && ['serverSideJavaScript', 'POSTkey'].includes(origdata[i].type)) {
                this.error('', 400);
                return;
            }
            if (origdata[i].type === 401 && !auth && ['all files', filerequested].includes(origdata[i].request_path)) {
                authdata = origdata[i];
                auth = true;
            }
            if ([filerequested, 'all files'].includes(origdata[i].request_path) && [allow, deny].includes(origdata[i].type) && !filefound) {
                data = origdata[i];
                filefound = true;
            }
        }
        if (auth) {
            if (!authdata.username || !authdata.password) {
                this.htaccessError('Missing Auth Username and/or Password');
                return;
            }
            let validAuth = false;
            const authHeader = this.request.headers['authorization'];
            if (authHeader) {
                if (authHeader.slice(0,6).toLowerCase() === 'basic ') {
                    const userpass = atob(authHeader.slice(6,auth.length)).split(':');
                    if (userpass[0] === authdata.username && userpass[1] === authdata.password) {
                        validAuth = true;
                    }
                }
            }
            if (!validAuth) {
                this.error("", 401);
                return;
            }
        }
        if (!filefound) {
            callback();
            return;
        }
        if (data.type === allow) {
            callbackSkip();
        } else if (data.type === deny) {
            this.responseLength = 0;
            this.writeHeaders(400);
            this.finish();
            return;
        }
    }
    delete() {
        function deleteMain() {
            const entry = this.fs.getByPath(this.request.origpath);
            if (entry.error) {
                this.writeHeaders(404);
                this.finish();
                return;
            }
            const result = entry.remove();
            if (result.error) {
                this.writeHeaders(500);
                this.finish();
                return;
            }
            this.writeHeaders(200);
            this.finish();
        }
        function deleteCheck() {
            if (!this.opts.delete) {
                this.responseLength = 0;
                this.writeHeaders(400);
                this.finish();
                return;
            }
            deleteMain.bind(this)();
        }
        this.deletePutHtaccess('allow delete', 'deny delete', deleteCheck.bind(this), deleteMain.bind(this));
    }
    put() {
        function putMain() {
            const entry = this.fs.getByPath(this.request.origpath)
            if (entry.error || this.opts.replace) {
                if (!entry.error) {
                    if (entry.remove().error) {
                        this.writeHeaders(500);
                        this.finish();
                    }
                }
                const stream = this.fs.createWriteStream(this.request.origpath);
                stream.on('error', (err) => {
                    console.error('Error writing file', err);
                    this.writeHeaders(500);
                    this.finish();
                })
                this.req.pipe(stream);
                this.req.on('end', () => {
                    this.writeHeaders(201);
                    this.finish();
                })
            } else {
                this.writeHeaders(400);
                this.finish();
            }
        }
        function putCheck() {
            if (!this.opts.upload) {
                this.responseLength = 0;
                this.writeHeaders(400);
                this.finish();
                return;
            }
            putMain.bind(this)();
        }
        this.deletePutHtaccess('allow put', 'deny put', putCheck.bind(this), putMain.bind(this));
    }
    post() {
        const htaccessPath = WSC.utils.stripOffFile(this.request.origpath);
        let file = this.fs.getByPath(htaccessPath+this.htaccessName);
        if (!file || file.error || file.isDirectory) {
            this.error('', 404);
            return;
        }
        let data = file.text();
        let origdata;
        try {
            origdata = JSON.parse(data);
        } catch(e) {
            console.warn('Htaccess JSON parse error', e, htaccessPath);
            this.error('', 500);
            this.finish();
            return;
        }
        if (!Array.isArray(origdata)) {
            console.warn('is not an array', htaccessPath);
            this.error('invalid config', 500);
            this.finish();
            return;
        }
        const filerequested = this.request.origpath.split('/').pop();
        let filefound = false;
        let auth = false;
        let authdata;
        for (let i=0; i<origdata.length; i++) {
            if (! origdata[i].type) {
                this.htaccessError('Missing Type');
                return;
            }
            if (!origdata[i].request_path && origdata[i].type !== 'directory listing') {
                this.htaccessError('Missing Request Path');
                return;
            }
            origdata[i].original_request_path = origdata[i].request_path;
            origdata[i].filerequested = filerequested;
            origdata[i].request_path = WSC.utils.htaccessFileRequested(origdata[i].request_path, this.opts.showIndex);
            if (origdata[i].type === 401 && !auth && [filerequested, 'all files'].includes(origdata[i].request_path)) {
                authdata = origdata[i];
                auth = true;
            }
            if (origdata[i].type === 403 && origdata[i].request_path === filerequested) {
                this.error('', 403);
                return;
            }
            if (origdata[i].type === 'POSTkey' && !filefound) {
                if (this.request.origpath.split('/').pop() === origdata[i].original_request_path || 
                    (origdata[i].original_request_path.split('/').pop() === 'index.html' && 
                     this.request.origpath.endsWith('/') &&
                     this.opts.showIndex) ||
                    (['html', 'htm', 'xhtm', 'xhtml'].includes(origdata[i].original_request_path.split('.').pop()) && 
                     origdata[i].original_request_path.split('/').pop().split('.')[0] === this.request.origpath.split('/').pop()
                     && this.opts.excludeDotHtml)) {
                    data = origdata[i];
                    filefound = true;
                }
            }
        }
        // Still need to validate POST key
        if (auth) {
            if (!authdata.username || !authdata.password) {
                this.htaccessError('Missing Auth Username and/or Password');
                return;
            }
            let validAuth = false;
            const authHeader = this.request.headers['authorization'];
            if (authHeader) {
                if (authHeader.slice(0,6).toLowerCase() === 'basic ') {
                    const userpass = atob(authHeader.slice(6, authHeader.length)).split(':');
                    if (userpass[0] === authdata.username && userpass[1] === authdata.password) {
                        validAuth = true;
                    }
                }
            }
            if (!validAuth) {
                this.error("", 401);
                return;
            }
        }
        if (!filefound) {
            this.error('', 404);
            return;
        }
        if (!data.key) {
            this.htaccessError('Missing Key');
            return;
        }
        file = this.fs.getByPath(WSC.utils.stripOffFile(this.request.origpath)+data.original_request_path);
        if (!file || file.error || !file.isFile) {
            this.error('', 404);
            return;
        }
        const contents = file.text();
        let validFile = false;
        let key = contents.replace(/ /g, '').split('postKey=');
        if (key.length > 1) {
            key = key.pop();
            key = key.substring(1, key.length).split('"')[0].split("'")[0];
            if (key === data.key) {
                validFile = true;
            }
        }
        if (!validFile) {
            consle.error('Post key missing!', htaccessPath + this.htaccessName);
            this.error('Script auth error', 403);
            return;
        }
        const req = this.request;
        const res = this;
        const clearModuleCache = function() {
            for (let i=0; i<global.cachedFiles.length; i++) {
                delete require.cache[require.resolve(global.cachedFiles[i])];
            }
            global.cachedFiles = [];
        }
        const requireFile = function(path) {
            path = res.fs.mainPath + WSC.utils.relativePath(WSC.utils.stripOffFile(res.request.origpath), path);
            if (!global.cachedFiles.includes(path)) {
                global.cachedFiles.push(path);
            }
            return require(path);
        }
        if (!global.tempData) {
            global.tempData = {};
        }
        try {
            eval('(function() {const handler = function(req, res, httpRequest, appInfo, clearModuleCache, requireFile) {\n' + contents + '\n};handler(req, res, WSC.httpRequest, {"server": "Simple Web Server"}, clearModuleCache, requireFile)})();');
        } catch(e) {
            console.error(e);
            this.error('Check logs', 500);
            this.finish();
        }
    }
    get() {
        this.setHeader('accept-ranges', 'bytes');
        this.setHeader('connection', 'keep-alive');
        if (!this.fs) {
            this.error("Directory Not Chosen", 500);
            return;
        }
        this.request.isVersioning = false;
        if (typeof this.opts.cacheControl === 'string' && this.opts.cacheControl.trim() !== '') {
            this.setHeader('cache-control', this.opts.cacheControl);
        }
        if (this.opts.excludeDotHtml && !this.request.origpath.endsWith("/") && this.request.path !== '') {
            const extension = this.request.path.split('.').pop();
            const more = this.request.uri.substring(0, this.request.path.origpath);
            if (['htm', 'html'].includes(extension)) {
                const path = this.request.path;
                let newpath;
                if (extension === 'html') {
                    newpath = path.substring(0, path.length - 5);
                } else {
                    newpath = path.substring(0, path.length - 4);
                }
                newpath = newpath+more;
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
    }
    onEntryMain() {
        if (this.opts.excludeDotHtml && this.request.path !== '' && ! this.request.origpath.endsWith("/")) {
            let file = this.fs.getByPath(this.request.origpath+'.html');
            if (!file.error && file.isFile) {
                this.setHeader('content-type','text/html; charset=utf-8');
                this.renderFileContents(file);
                return;
            }
            file = this.fs.getByPath(this.request.origpath+'.htm');
            if (!file.error && file.isFile) {
                this.setHeader('content-type','text/html; charset=utf-8');
                this.renderFileContents(file);
                return;
            }
        }
        if (this.entry && this.entry.isFile && this.request.origpath.endsWith('/') && this.request.path !== '') {
            this.setHeader('location', this.request.path);
            this.writeHeaders(301);
            this.finish();
            return;
        }
        if (this.entry && this.entry.isDirectory && ! this.request.origpath.endsWith('/')) {
            const newloc = this.request.origpath + '/';
            this.setHeader('location', newloc);
            this.responseLength = 0;
            this.writeHeaders(301);
            this.finish();
            return;
        }
        if (!this.entry) {
            this.error('No Entry',404);
        } else if (this.entry.error) {
            if (this.entry.error.code === 'EPERM') {
                this.error('', 403);
            } else {
                this.error('Entry Not Found: ' + (this.rewrite_to || this.request.path).htmlEscape(), 404);
            }
        } else if (this.entry.isFile) {
            this.renderFileContents(this.entry);
        } else {
            const results = this.entry.getDirContents();
            if (results.error) {
                this.error('', ((results.error.code === 'EPERM')?403:500));
                return;
            }
            if (this.opts.showIndex) {
                for (let i=0; i<results.length; i++) {
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
            if (!this.opts.directoryListing) {
                this.error("", 404);
            } else {
                this.renderDirListing(results);
            }
        }
    }
    onEntry(entry) {
        this.entry = entry;
        if (!this.opts.htaccess) {
            this.onEntryMain();
            return;
        }
        this.htaccessInit();
    }
    handleHtaccessRequest(data) {
        switch (data.type) {
            case 301:
            case 302:
            case 307:
                WSC.htaccess.redirect.bind(this)(data);
                break;
            case 403:
                WSC.htaccess.notAllowed.bind(this)();
                break;
            case 'denyDirectAccess':
                WSC.htaccess.denyDirectAccess.bind(this)(data);
                break;
            case 'directory listing':
                WSC.htaccess.directoryListing.bind(this)();
                break;
            case 'send directory contents':
                WSC.htaccess.sendDirectoryContents.bind(this)(data);
                break;
            case 'versioning':
                WSC.htaccess.versioning.bind(this)(data);
                break;
            case 'serverSideJavaScript':
                WSC.htaccess.serverSideJavaScript.bind(this)(data);
                break;
            default:
                this.onEntryMain();
                break;
        }
    }
    htaccessMain(filerequested) {
        const finalpath = WSC.utils.stripOffFile(this.request.origpath);
        const file = this.fs.getByPath(finalpath+this.htaccessName);
        if (file.error || !file.isFile) {
            this.onEntryMain();
            return;
        }
        const dataa = file.text();
        let origdata;
        try {
            origdata = JSON.parse(dataa);
            if (!Array.isArray(origdata)) {
                throw new Error('Not An Array');
            }
        } catch(e) {
            console.error('Config Error', finalpath+this.htaccessName, e);
            this.error('', 500);
            this.finish();
            return;
        }

        let filefound = false;
        let auth;
        let authdata;
        let data = false;
        let htaccessHeaders = [];
        let additionalHeaders = false;
        let hasPost = false;
        if (origdata.length === 0 || !origdata.length) {
            this.onEntryMain();
            return;
        }
        for (let i=0; i<origdata.length; i++) {
            if (!origdata[i].type) {
                this.htaccessError('Missing Type');
                return;
            }
            if (!origdata[i].request_path && origdata[i].type !== 'directory listing') {
                this.htaccessError('Missing Request Path');
                return;
            }
            origdata[i].original_request_path = origdata[i].request_path;
            origdata[i].filerequested = filerequested;
            origdata[i].request_path = WSC.utils.htaccessFileRequested(origdata[i].request_path, this.opts.showIndex);
            if (origdata[i].type === 401 && !auth && [filerequested, 'all files'].includes(origdata[i].request_path) && !this.request.isVersioning) {
                auth = true;
                authdata = origdata[i];
            }
            if (origdata[i].type === 'directory listing' &&
                this.request.origpath.split('/').pop() === '' &&
                !filefound) {
                data = origdata[i];
                filefound = true;
            }
            if (origdata[i].type === 'send directory contents' && origdata[i].request_path === filerequested) {
                const extension = origdata[i].original_request_path.split('.').pop();
                if (['htm', 'html'].includes(extension)) {
                    data = origdata[i];
                    filefound = true;
                }
            }
            if (origdata[i].type === 'serverSideJavaScript' && !filefound) {
                if (this.request.origpath.split('/').pop() === origdata[i].original_request_path || 
                    (['html', 'htm'].includes(origdata[i].original_request_path.split('.').pop()) && 
                     origdata[i].original_request_path.split('/').pop().split('.')[0] === this.request.origpath.split('/').pop() &&
                     this.opts.excludeDotHtml) ||
                    (origdata[i].original_request_path.split('/').pop() === 'index.html' && 
                     this.request.origpath.endsWith('/') &&
                     this.opts.showIndex)) {
                    data = origdata[i];
                    filefound = true;
                }
            }
            if ([filerequested, 'all files'].includes(origdata[i].request_path) && origdata[i].type === 'versioning' && !filefound && !this.request.isVersioning) {
                data = origdata[i];
                filefound = true;
            }
            if ([filerequested, 'all files'].includes(origdata[i].request_path) &&
                !filefound &&
                !['allow delete', 'allow put', 'deny delete', 'deny put', 401, 'directory listing', 'additional header', 'send directory contents', 'POSTkey', 'serverSideJavaScript', 'versioning'].includes(origdata[i].type)) {
                data = origdata[i];
                filefound = true;
            }
            if (this.request.origpath.split('/').pop() === origdata[i].original_request_path && origdata[i].type === 'POSTkey') {
                hasPost = true;
            }
            //console.log(origdata[i].request_path === filerequested);
            if ([filerequested, 'all files'].includes(origdata[i].request_path) && origdata[i].type === 'additional header') {
                additionalHeaders = true;
                htaccessHeaders.push(origdata[i]);
            }
        }
        //console.log(data);
        //console.log(authdata);
        //console.log(filefound);
        if (hasPost && data.type !== 'serverSideJavaScript') {
            this.error('', 400);
            return;
        }
        //console.log(htaccessHeaders)
        if (additionalHeaders) {
            for (let i=0; i<htaccessHeaders.length; i++) {
                this.setHeader(htaccessHeaders[i].headerType, htaccessHeaders[i].headerValue);
            }
        }
        if (!auth || authdata.type !== 401) {
            this.handleHtaccessRequest(data);
            return;
        }
        if (auth) {
            if (!authdata.username || !authdata.password) {
                this.htaccessError('Missing Auth Username and/or Password');
                return;
            }
            let validAuth = false;
            const authHeader = this.request.headers['authorization'];
            if (authHeader) {
                if (authHeader.slice(0,6).toLowerCase() === 'basic ') {
                    const userpass = atob(authHeader.slice(6, authHeader.length)).split(':');
                    if (userpass[0] === authdata.username && userpass[1] === authdata.password) {
                        validAuth = true;
                    }
                }
            }
            if (!validAuth) {
                this.error("", 401);
                return;
            }
        }
        if (!filefound) {
            this.onEntryMain();
            return;
        }
        this.handleHtaccessRequest(data);
    }
    htaccessInit() {
        if (this.opts.excludeDotHtml) {
            let file = this.fs.getByPath(this.request.origpath+'.html');
            if (!file.error) {
                if (this.request.origpath.endsWith("/")) {
                    this.htaccessMain('');
                    return;
                }
                const filerequested = WSC.utils.htaccessFileRequested((this.request.path+'.html').split('/').pop(), this.opts.showIndex);
                this.htaccessMain(filerequested);
                return;
            }
            file = this.fs.getByPath(this.request.origpath+'.htm');
            if (! file.error) {
                if (this.request.origpath.endsWith("/")) {
                    this.htaccessMain('');
                    return;
                }
                const filerequested = WSC.utils.htaccessFileRequested((this.request.path+'.htm').split('/').pop(), this.opts.showIndex);
                this.htaccessMain(filerequested);
                return;
            }
        }
        if (this.entry && this.entry.isDirectory && ! this.request.origpath.endsWith('/')) {
            const newloc = this.request.origpath + '/';
            this.setHeader('location', newloc);
            this.responseLength = 0;
            this.writeHeaders(301);
            this.finish();
            return;
        }
        const filerequested = WSC.utils.htaccessFileRequested(this.request.origpath.split('/').pop(), this.opts.showIndex);
        this.htaccessMain(filerequested);
    }
    renderFileContents(entry) {
        if (!entry.path) {
            this.error('', 404);
            return;
        }
        if (entry.hidden && !this.opts.hiddenDotFiles) {
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
                return;
            }
            let fileOffset, fileEndOffset, code;
            if (this.request.headers['range']) {
                //console.log('range request')
                const range = this.request.headers['range'].split('=')[1].trim();
                const rparts = range.split('-');
                fileOffset = parseInt(rparts[0]);
                if (! rparts[1]) {
                    fileEndOffset = entry.size - 1;
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
            let compression = false;
            const stream = this.fs.createReadStream(entry.fullPath, {start: fileOffset,end: fileEndOffset});
            if (this.request.headers['accept-encoding'] && this.opts.compression) {
                const ac = this.request.headers['accept-encoding'];
                if (ac.includes('br') || ac.includes('gzip') || ac.includes('deflate')) {
                    compression = true;
                    let compresionStream;
                    if (ac.includes('gzip')) {
                        this.setHeader('Content-Encoding', 'gzip');
                        compresionStream = zlib.createGzip();
                    } else if (ac.includes('br')) {
                        this.setHeader('Content-Encoding', 'br');
                        compresionStream = zlib.createBrotliCompress();
                    } else if (ac.includes('deflate')) {
                        this.setHeader('Content-Encoding', 'deflate');
                        compresionStream = zlib.createDeflate();
                    }
                    pipeline(stream, compresionStream, this.res, (err) => {
                        if (err) {
                            console.warn('Compression Error:', err);
                            this.res.end();
                        } else {
                            //Success
                            stream.close();
                            compresionStream.close();
                        }
                    });
                }
            }
            this.writeHeaders(code);
            if (!compression) {
                const res = this.res;
                stream.on('open', () => {
                    stream.pipe(res).on('error', (error) => {
                        console.error(error);
                        stream.close();
                    })
                })
                stream.on('error', (error) => {
                    console.error(error);
                    stream.close();
                })
                res.on("close", () => {
                    stream.close();
                })
            }
        }
    }
    entriesSortFunc(a, b) {
        const anl = a.name.toLowerCase();
        const bnl = b.name.toLowerCase();
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
    }
    renderDirectoryListingJSON(origResults) {
        this.setHeader('content-type','application/json; charset=utf-8');
        let results = [];
        for (let i=0; i<origResults.length; i++) {
            if (! origResults[i].hidden || (this.opts.hiddenDotFiles && this.opts.hiddenDotFilesDirectoryListing)) {
                results.push(origResults[i]);
            }
        }
        this.write(JSON.stringify(results.map(function(f) {
            return {
                name: f.name,
                fullPath: f.fullPath,
                isFile: f.isFile,
                isDirectory: f.isDirectory
            }
        }), null, 2));
    }
    renderDirectoryListingStaticJs(results) {
        if (! WSC.static_template_data) {
            return this.renderDirectoryListing(results);
        }
        let html = ['<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="google" value="notranslate"><title id="title"></title></head>'];
        html.push('<noscript><style>li.directory {background:#aab}</style><a href="../?static=1">parent</a><ul>');
        results.sort(this.entriesSortFunc);
        for (let i=0; i<results.length; i++) {
            const name = results[i].name.htmlEscape();
            if (!results[i].hidden || (this.opts.hiddenDotFiles && this.opts.hiddenDotFilesDirectoryListing)) {
                if (results[i].isDirectory) {
                    html.push('<li class="directory"><a href="' + name + '/?static=1">' + name + '</a></li>');
                } else {
                    html.push('<li><a href="' + name + '?static=1">' + name + '</a></li>');
                }
            }
        }
        html.push('</ul></noscript>');
        html.push('<div style="display:none;" id="javascriptDirectoryListing">');
        html.push(WSC.static_template_data);
        html.push('<script>start("'+this.request.origpath+'")</script>');
        if (this.request.origpath !== '/') {
            html.push('<script>onHasParentDirectory();</script>');
        }
        for (let i=0; i<results.length; i++) {
            if (! results[i].hidden || (this.opts.hiddenDotFiles && this.opts.hiddenDotFilesDirectoryListing)) {
                const rawname = results[i].name.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
                const name = encodeURIComponent(results[i].name).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
                const isdirectory = results[i].isDirectory;
                const modified = WSC.utils.lastModified(results[i].modificationTime);
                const filesize = results[i].size;
                const filesizestr = WSC.utils.humanFileSize(results[i].size);
                const modifiedstr = WSC.utils.lastModifiedStr(results[i].modificationTime);

                html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>');
            }
        }
        html.push('</div>');
        html.push('<script>document.getElementById("javascriptDirectoryListing").style = "display:block;"</script>');
        html.push('</body></html>');
        this.setHeader('content-type','text/html; charset=utf-8');
        this.write(html.join('\n'));
        this.finish();
    }
    renderDirectoryListingTemplate(results) {
        if (!WSC.template_data) {
            return this.renderDirectoryListing(results);
        }
        let html = [WSC.template_data];
        html.push('<script>start("'+this.request.origpath+'")</script>');
        if (this.request.origpath !== '/') {
            html.push('<script>onHasParentDirectory();</script>');
        }
        for (let i=0; i<results.length; i++) {
            if (! results[i].hidden || (this.opts.hiddenDotFiles && this.opts.hiddenDotFilesDirectoryListing)) {
                const rawname = results[i].name.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
                const name = encodeURIComponent(results[i].name).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
                const isdirectory = results[i].isDirectory;
                const modified = WSC.utils.lastModified(results[i].modificationTime);
                const filesize = results[i].size;
                const filesizestr = WSC.utils.humanFileSize(results[i].size);
                const modifiedstr = WSC.utils.lastModifiedStr(results[i].modificationTime);
                html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>');
            }
        }
        this.setHeader('content-type','text/html; charset=utf-8');
        this.write(html.join('\n'));
        this.finish();
    }
    renderDirListing(results) {
        if (!results || (results && (results.error || !Array.isArray(results)))) {
            this.error('', ((results.error.code === 'EPERM')?403:500));
            return;
        }
        try {
            if (this.request.arguments && ['1','true'].includes(this.request.arguments.json) || (this.request.headers['accept'] && this.request.headers['accept'].toLowerCase().includes('application/json'))) {
                this.renderDirectoryListingJSON(results);
            } else if (this.request.arguments && ['1','true'].includes(this.request.arguments.static)) {
                this.renderDirectoryListing(results);
            } else if (this.request.arguments && ['1','true'].includes(this.request.arguments.staticjs)) {
                this.renderDirectoryListingStaticJs(results);
            } else if (this.request.arguments && ['1','true'].includes(this.request.arguments.js)) {
                this.renderDirectoryListingTemplate(results);
            } else if (this.opts.staticDirectoryListing) {
                this.renderDirectoryListing(results);
            } else {
                this.renderDirectoryListingStaticJs(results);
            }
        } catch(e) {
            this.error("Something went wrong", 500);
            if (e) console.warn('error: ', e);
        }
    }
    htaccessError(errormsg) {
        this.error('Config Error', 500);
        console.warn('Htaccess Error: ' + errormsg);
    }
    // everything from here to the end of the class are tools for server side post/get handling
    getFile(path, callback) {
        if (!path.startsWith('/')) {
            path = WSC.utils.relativePath(WSC.utils.stripOffFile(this.request.origpath), path);
        }
        if (!callback) return;
        callback(this.fs.getByPath(path)); //TODO - don't use callbacks
    }
    getFilePromise(path) {
        return new Promise((resolve, reject) => {
            this.getFile(path, resolve);
        })
    }
    writeFile(path, data, allowReplaceFile, callback) {
        if (!path.startsWith('/')) {
            path = WSC.utils.relativePath(WSC.utils.stripOffFile(this.request.origpath), path);
        }
        if (!callback) {
            callback = function(){};
        }
        this.fs.writeFile(path, data, callback, allowReplaceFile);
    }
    writeFilePromise(path, data, allowReplaceFile) {
        return new Promise((resolve, reject) => {
            this.writeFile(path, data, allowReplaceFile, resolve);
        })
    }
    deleteFile(path, callback) {
        if (!path.startsWith('/')) {
            path = WSC.utils.relativePath(WSC.utils.stripOffFile(this.request.origpath), path);
        }
        if (!callback) {
            callback = function(){};
        }
        this.fs.getByPath(path, (file) => {
            if (file && !file.error) {
                file.remove(callback);
            } else {
                callback({error: file.error});
            }
        })
    }
    deleteFilePromise(path) {
        return new Promise((resolve, reject) => {
            this.deleteFile(path, resolve);
        })
    }
    writeCode(code) {
        if (!code) {
            code = 200;
        }
        this.responseLength = 0;
        this.writeHeaders(code);
    }
    contentType(type) {
        const default_types = ['text/html',
                               'text/xml',
                               'text/plain',
                               "text/vnd.wap.wml",
                               "application/javascript",
                               "application/rss+xml"]
        if (type.split('chartset=').length !== 1 && default_types.includes(type)) {
            type = type + '; charset=utf-8';
        }
        this.setHeader('content-type', type);
    }
    end() {
        this.finish();
    }
    readBody(callback) {
        if (!callback) {
            callback = function(){};
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
        this.req.on('data', chunk => {
            if (chunk) {
                this.request.body = Buffer.concat([this.request.body, chunk]);
            }
        });
        this.req.on('end', () => {
            this.request.consumedRequest = true;
            callback(this.request.body);
        })
    }
    readBodyPromise() {
        return new Promise((resolve, reject) => {
            this.readBody(resolve);
        })
    }
    stream2File(path, allowOverWrite, callback) {
        if (!path.startsWith('/')) {
            path = WSC.utils.relativePath(WSC.utils.stripOffFile(this.request.origpath), path);
        }
        if (!callback) {
            callback = function(){};
        }
        if (this.request.consumedRequest && this.request.body !== null) {
            this.fs.writeFile(path, this.request.body, callback, allowOverWrite);
            return;
        } else if (this.request.consumedRequest) {
            callback({error: 'Request body already consumed'});
            return;
        }
        this.fs.getByPath(path, entry => {
            if (entry.error || allowOverWrite) {
                if (!entry.error) {
                    const result = entry.remove();
                    if (result.error) {
                        callback({error: result.error});
                        return;
                    }
                }
                const file = this.fs.createWriteStream(path);
                file.on('error', err => {
                    callback({error: err});
                })
                this.req.pipe(file);
                this.req.on('end', () => {
                    this.request.consumedRequest = true;
                    callback({error: false, success: true});
                });
            } else {
                callback({error: 'File Already Exists'});
            }
        });
    }
}

module.exports = DirectoryEntryHandler;
