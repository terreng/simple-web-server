module.exports = {
    redirect: function(data) {
        if (!data.redirto) {
            this.htaccessError('Missing Redirect Location');
            return;
        }
        this.setHeader('location', data.redirto);
        this.responseLength = 0;
        this.writeHeaders(data.type);
        this.finish();
    },
    denyDirectAccess: function(data) {
        const method = this.request.headers['sec-fetch-dest'];
        //console.log(method)
        if (method === "document") {
            this.error('', 403);
        } else {
            this.onEntryMain();
        }
    },
    notAllowed: function() {
        this.error('', 403);
    },
    directoryListing: function() {
        this.getDirContents(this.entry, this.renderDirListing.bind(this));
    },
    sendDirectoryContents: function(data) {
        const entry = this.fs.getByPath(WSC.utils.stripOffFile(this.request.origpath) + data.original_request_path);
        if (entry.error || entry.isDirectory) {
            this.htaccessError('Invalid path to send dir contents');
            return;
        }
        if (!data.dir_to_send || data.dir_to_send.replace(' ', '') === '') {
            data.dir_to_send = './';
        }
        let path2Send = data.dir_to_send;
        let finalpath = WSC.utils.stripOffFile(this.request.origpath);
        path2Send = WSC.utils.relativePath(finalpath, path2Send);
        
        const results = this.fs.getByPath(path2Send).getDirContents();
        if (results.error) {
            this.error('', ((results.error.code === 'EPERM')?403:500));
            return;
        }
        finalpath = WSC.utils.stripOffFile(this.request.origpath) + data.original_request_path;
        const file = this.fs.getByPath(finalpath);
        if (file.error || !file.isFile) {
            if (file.error) {
                this.error('', ((results.error.code === 'EPERM')?403:500));
            } else {
                this.error('', 500);
            }
            return;
        }
        const html = [entry.text()];
        for (var w=0; w<results.length; w++) {
            const rawname = results[w].name.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
            const name = encodeURIComponent(results[w].name).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
            const isdirectory = results[w].isDirectory;
            const modified = WSC.utils.lastModified(results[w].modificationTime);
            const filesize = results[w].size;
            const filesizestr = WSC.utils.humanFileSize(results[w].size);
            const modifiedstr = WSC.utils.lastModifiedStr(results[w].modificationTime);
            if (!results[w].hidden || (this.app.opts.hiddenDotFiles && this.app.opts.hiddenDotFilesDirectoryListing)) {
                html.push('<script>addRow("'+rawname+'","'+name+'",'+isdirectory+',"'+filesize+'","'+filesizestr+'","'+modified+'","'+modifiedstr+'");</script>');
            }
        }
        this.setHeader('content-type','text/html; charset=utf-8');
        this.write(html.join('\n'));
        this.finish();
    },
    versioning: function(data) {
        //console.log('versioning')
        if (!data.version_data || data.version_data.length === 0) {
            this.htaccessError('Missing version data');
            return;
        }
        if (!data.variable) {
            this.htaccessError('Missing variable');
            return;
        }
        if (!data.default) {
            this.htaccessError('Missing default file selection');
            return;
        }
        const versionData = data.version_data;
        let vdata4 = this.request.arguments[data.variable];
        if (!versionData[vdata4]) {
            vdata4 = data.default;
        }
        let vdataa = versionData[vdata4.toString()];
        const finalpath = WSC.utils.stripOffFile(this.request.origpath);
        console.log(finalpath, vdataa);
        vdataa = WSC.utils.relativePath(finalpath, vdataa);
        
        const file = this.fs.getByPath(vdataa);
        if (file && !file.error) {
            this.request.path = vdataa;
            if (file.isFile) {
                this.request.origpath = vdataa;
                this.request.uri = vdataa;
            } else {
                if (!vdataa.endsWith("/")) {
                    vdataa += '/';
                }
                this.request.origpath = vdataa;
                this.request.uri = vdataa;
            }
            this.request.isVersioning = true;
            this.onEntry(file);
        } else {
            console.warn('Path in htaccess file for version '+vdata4+' is missing or the file does not exist. Please check to make sure you have properly inputed the value', this.request.uri);
            this.error('', 500);
        }
    },
    serverSideJavaScript: function(data) {
        if (!data.key) {
            this.htaccessError('Missing key');
            return;
        }
        const file = this.fs.getByPath(WSC.utils.stripOffFile(this.request.origpath) + data.original_request_path);
        if (file && !file.error && file.isFile) {
            const dataa = file.text();
            const contents = dataa;
            let validFile = false;
            let key = contents.replace(/ /g, '').split('SSJSKey=');
            if (key.length > 1) {
                key = key.pop();
                key = key.substring(1, key.length).split('"')[0].split("'")[0];
                if (key === data.key) {
                    validFile = true;
                }
            }
            if (validFile) {
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
                    eval('(function() {const handler = function(req, res, httpRequest, appInfo, clearModuleCache, requireFile) {\n' + dataa + '\n};handler(req, res, WSC.httpRequest, {"server": "Simple Web Server"}, clearModuleCache, requireFile)})();');
                } catch(e) {
                    console.error(e);
                    this.error('', 500);
                    this.finish();
                }
            } else {
                this.error('Script auth error', 403);
            }
        } else if (file.isDirectory) {
            this.error('Error', 500);
        } else {
            this.error('', 404);
        }
    }
}
