const { URL } = require('url');
const http = require('http');
const https = require('https');

function httpRequest() {
    this.onload = null
    this.onerror = null
    this.res = null
    this.reDirected = false
    this.reDirectCount = 0
    this.reDirectLimit = 10
    this.headers = { }
    this.body = Buffer.from('')
    this.streamToFile = false
    this.savePath = null
    this.handler = null
    this.request = { }
}

httpRequest.prototype = {
    setRequestHeader: function(k, v) {
        this.headers[k] = v
    },
    setHeader: function(k, v) {
        this.headers[k] = v
    },
    open: function(method, url) {
        if (! url.startsWith('http')) {
            var error = 'url must start with http or https'
			console.error(error)
            if (this.onerror && typeof this.onerror == 'function') {
                this.onerror(error)
            } else if (this.onload && typeof this.onload == 'function') {
                this.onload(error)
            } else {
                throw new Error(error)
            }
            return
        }
        this.method = method
        const { port, pathname, search, protocol, host } = new URL(url)
        var path = pathname + search
        if (protocol =='https:') {
            this.req = https.request({method: method, protocol: protocol, host: host, path: path, port: port || 443})
        } else {
            this.req = http.request({method: method, protocol: protocol, host: host, path: path, port: port || 80})
        }
        this.req.on('error', function(error) {
            if (this.onerror && typeof this.onerror == 'function') {
                this.onerror(error)
            } else if (this.onload && typeof this.onload == 'function') {
                this.onload(error)
            }
        }.bind(this))
    },
    send: function(data) {
        for (var k in this.headers) {
            this.req.setHeader(k, this.headers[k])
        }
        if (data) {
            if (typeof data == 'string') {
                var data = Buffer.from(data)
            }
            this.responseData = data
            this.req.setHeader('content-length', data.byteLength)
        }
        this.req.on('response', this.onResponse.bind(this))
        this.req.end()
    },
    onResponse: function(res) {
        res.on('error', function(error) {
            if (this.onerror && typeof this.onerror == 'function') {
                this.onerror(error)
            } else if (this.onload && typeof this.onload == 'function') {
                this.onload(error)
            }
        }.bind(this))
        this.res = res
        if ((res.statusCode == 301 || res.statusCode == 302 || res.statusCode == 307) && this.reDirectLimit > this.reDirectCount && res.headers.location) {
            var request = new WSC.httpRequest()
            request.streamToFile = this.streamToFile
            request.savePath = this.savePath
            request.handler = this.handler
            request.reDirectCount = this.reDirectCount + 1
            request.reDirected = true
            request.headers = this.headers
            request.onload = this.onload
            request.open(this.method, res.headers.location)
            request.send(this.responseData || undefined)
            return
        }
        if (! this.streamToFile) {
            res.on('data', (chunk) => {
                this.body = Buffer.concat([this.body, chunk])
            })
            res.on('end', () => {
                var evt = {target: {headers:this.res.headers,
                                    code:this.res.statusCode,
                                    status:this.res.statusCode,
                                    responseHeaders:this.res.rawHeaders,
                                    responseHeadersParsed:this.res.headers,
                                    response:this.body,
                                    redirected:this.reDirected}
                          }
                if (this.onload && typeof this.onload == 'function') {
                    this.onload(evt)
                }
            })
        } else {
            if (! this.savePath.startsWith('/')) {
                this.savePath = WSC.utils.relativePath(this.savePath, WSC.utils.stripOffFile(this.handler.request.origpath))
            }
            var writeStream = this.handler.fs.createWriteStream(this.savePath)
            writeStream.on('error', function (err) {
                var evt = {error: err}
                if (this.onerror && typeof this.onerror == 'function') {
                    this.onerror(evt)
                } else if (this.onload && typeof this.onload == 'function') {
                    this.onload(evt)
                }
            }.bind(this))
            this.res.pipe(writeStream)
            this.res.on('end', function () {
                var evt = {target: {headers:this.res.headers,
                                    code:this.res.statusCode,
                                    status:this.res.statusCode,
                                    responseHeaders:this.res.rawHeaders,
                                    responseHeadersParsed:this.res.headers,
                                    response:'The response was written to a file.',
                                    redirected:this.reDirected}
                          }
                if (this.onload && typeof this.onload == 'function') {
                    this.onload(evt)
                }
            }.bind(this))
            
        }
    },
    setupStreamToFile: function(handler, savePath) {
        this.streamToFile = true
        this.handler = handler
        this.savePath = savePath
    }
}

function testHttpRequest() {
    var request = new httpRequest()
    request.onload = function(e) {
        console.log(e)
    }
    request.open('GET', 'http://www.google.com')
    request.send()
    
}

module.exports = httpRequest