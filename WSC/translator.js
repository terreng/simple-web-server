module.exports = {
    onRequest: function(serverconfig, req, res, FileSystem) {
        WSC.transformRequest(req, res, serverconfig, function(requestApp) {
            if (['GET','HEAD','PUT','POST','DELETE','OPTIONS'].includes(requestApp.request.method)) {
                const handler = new WSC.DirectoryEntryHandler(FileSystem, requestApp.request, requestApp.app.opts, req, res);
                handler.tryHandle();
            } else {
                res.statusCode = 501;
                res.statusMessage = 'Not Implemented';
                res.end();
            }
        })
    },
    transformRequest: function(req, res, settings, callback) {
        let curRequest = WSC.HTTPRequest({
            headers: req.headers,
            method: req.method,
            uri: req.url,
            version: req.httpVersion,
            ip: req.socket.remoteAddress
        })
        let app = {
            opts: settings
        }
        if (curRequest.method.toLowerCase() !== 'put' && req.headers['content-type'] && req.headers['content-type'].startsWith('application/x-www-form-urlencoded')) {
            req.on('data', chunk => {
                if (chunk) {
                    curRequest.body = Buffer.concat([curRequest.body, chunk])
                }
            })
            req.on('end', () => {
                curRequest.consumedRequest = true;
                if (curRequest.body.byteLength === 0) {
                    curRequest.body = null;
                } else {
                    try {
                        let ct = req.headers['content-type'];
                        if (ct) {
                            const default_charset = 'utf-8';
                            ct = ct.toLowerCase();
                            if (ct.startsWith('application/x-www-form-urlencoded')) {
                                const charset_i = ct.indexOf('charset=');
                                let charset;
                                if (charset_i != -1) {
                                    charset = ct.slice(charset_i + 'charset='.length, ct.length);
                                    //console.log('using charset', charset);
                                } else {
                                    charset = default_charset;
                                }
                                const bodydata = curRequest.body.toString(charset);
                                let bodyparams = {};
                                const items = bodydata.split('&');
                                for (var i=0; i<items.length; i++) {
                                    const kv = items[i].replaceAll(/\+/g, ' ').split('=');
                                    bodyparams[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
                                }
                                curRequest.bodyparams = bodyparams;
                            }
                        }
                    } catch(e) {
                        curRequest.bodyparams = null;
                    }
                }
                callback({request: curRequest, app: app});
            })
        } else {
            curRequest.body = null;
            callback({request: curRequest, app: app});
        }
    },
    HTTPRequest: function(opts) {
        let rv = {
            method: opts.method,
            uri: WSC.utils.relativePath(opts.uri, ''),
            ip: opts.ip,
            version: opts.version,
            headers: opts.headers,
            body: Buffer.from(''),
            bodyparams: null,
            consumedRequest: false,
            arguments: {}
        }
        var idx = rv.uri.indexOf('?');
        if (idx !== -1) {
            rv.path = decodeURIComponent(rv.uri.slice(0,idx));
            const s = rv.uri.slice(idx+1);
            const parts = s.split('&');

            for (var i=0; i<parts.length; i++) {
                const p = parts[i];
                const idx2 = p.indexOf('=');
                rv.arguments[decodeURIComponent(p.slice(0,idx2))] = decodeURIComponent(p.slice(idx2+1,s.length));
            }
        } else {
            rv.path = decodeURIComponent(rv.uri);
        }

        rv.origpath = rv.path;

        if (rv.path.endsWith('/')) {
            rv.path = rv.path.slice(0, rv.path.length-1);
        }
        return rv;
    }
}
