onRequest = function(serverconfig, req, res, FileSystem) {
    WSC.transformRequest(req, res, serverconfig, function(requestApp) {
        if (['GET','HEAD','PUT','POST','DELETE','OPTIONS'].includes(requestApp.request.method)) {
            var handler = new WSC.DirectoryEntryHandler(FileSystem, requestApp.request, requestApp.app, req, res);
            handler.tryHandle();
        } else {
            res.statusCode = 501;
            res.statusMessage = 'Not Implemented';
            res.end();
        }
    })
}

transformRequest = function(req, res, settings, callback) {
    var curRequest = WSC.HTTPRequest({headers: req.headers,
                                      method: req.method,
                                      uri: req.url,
                                      version: req.httpVersion,
                                      ip: req.socket.remoteAddress})
    var app = {
        opts: settings
    }
    if (curRequest.method.toLowerCase() != 'put' && (curRequest.method.toLowerCase() != 'post' || (req.headers['content-type'] && req.headers['content-type'].startsWith('application/x-www-form-urlencoded')))) {
        req.on('data', function(chunk) {
            if (chunk && chunk != 'undefined') {
                curRequest.body = Buffer.concat([curRequest.body, chunk])
            }
        })
        req.on('end', function() {
            curRequest.consumedRequest = true
            if (curRequest.body.byteLength == 0) {
                curRequest.body = null
            } else {
                try {
                    var ct = req.headers['content-type']
                    if (ct) {
                        var default_charset = 'utf-8'
                        var ct = ct.toLowerCase()
                        if (ct.startsWith('application/x-www-form-urlencoded')) {
                            var charset_i = ct.indexOf('charset=')
                            if (charset_i != -1) {
                                var charset = ct.slice(charset_i + 'charset='.length,
                                                       ct.length)
                                console.log('using charset',charset)
                            } else {
                                var charset = default_charset
                            }
                            var bodydata = curRequest.body.toString(charset)
                            var bodyparams = {}
                            var items = bodydata.split('&')
                            for (var i=0; i<items.length; i++) {
                                var kv = items[i].replace(/\+/g, ' ').split('=')
                                bodyparams[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1])
                            }
                            curRequest.bodyparams = bodyparams
                        }
                    }
                } catch(e) {
                    curRequest.bodyparams = null
                }
            }
            callback({request: curRequest, app: app})
        })
    } else {
        curRequest.body = null
        callback({request: curRequest, app: app})
    }
}

HTTPRequest = function(opts) {
    this.method = opts.method
    this.uri = WSC.utils.relativePath(opts.uri, '')
    this.ip = opts.ip
    this.version = opts.version
    this.headers = opts.headers
    this.body = Buffer.from('')
    this.bodyparams = null
    this.consumedRequest = false

    this.arguments = {}
    var idx = this.uri.indexOf('?')
    if (idx != -1) {
        this.path = decodeURIComponent(this.uri.slice(0,idx))
        var s = this.uri.slice(idx+1)
        var parts = s.split('&')

        for (var i=0; i<parts.length; i++) {
            var p = parts[i]
            var idx2 = p.indexOf('=')
            this.arguments[decodeURIComponent(p.slice(0,idx2))] = decodeURIComponent(p.slice(idx2+1,s.length))
        }
    } else {
        this.path = decodeURIComponent(this.uri)
    }

    this.origpath = this.path

    if (this.path[this.path.length-1] == '/') {
        this.path = this.path.slice(0,this.path.length-1)
    }
    return this
}

module.exports = {onRequest: onRequest, transformRequest: transformRequest, HTTPRequest: HTTPRequest}
