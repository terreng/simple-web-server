class httpRequest {
    onload;
    onerror;
    res;
    req;
    reDirected;
    reDirectCount;
    reDirectLimit;
    headers;
    body;
    streamToFile;
    savePath;
    handler;
    request;
    constructor() {
        this.onload = null;
        this.onerror = null;
        this.res = null;
        this.req = null;
        this.reDirected = false;
        this.reDirectCount = 0;
        this.reDirectLimit = 10;
        this.headers = {};
        this.body = Buffer.from('');
        this.streamToFile = false;
        this.savePath = null;
        this.handler = null;
        this.request = {};
    }
    setRequestHeader(k, v) {
        this.headers[k] = v;
    }
    setHeader(k, v) {
        this.headers[k] = v;
    }
    open(method, inUrl, allowInsecure) {
        const url = new URL(inUrl);
        if (!['https:', 'http:'].includes(url.protocol)) {
            const error = new Error('Url must start with http or https');
            this.error(error);
            return;
        }
        this.method = method;
        const { port, pathname, search, protocol, host } = url;
        const path = pathname + search;
        let opts = {method: method, protocol: protocol, host: host, path: path};
        if (protocol === 'https:') {
            opts.port = port || 443;
            if (allowInsecure === true) {
                opts.rejectUnauthorized = false;
                opts.requestCert = true;
            }
            this.req = https.request(opts);
        } else {
            opts.port = port || 80;
            this.req = http.request(opts);
        }
        this.req.on('error', this.error.bind(this))
    }
    send(data) {
        try {
            for (const k in this.headers) {
                this.req.setHeader(k, this.headers[k]);
            }
            if (data) {
                if (!Buffer.isBuffer(data)) {
                    data = Buffer.from(data);
                }
                this.responseData = data;
                this.req.setHeader('content-length', data.byteLength);
            }
            this.req.on('response', this.onResponse.bind(this));
            if (this.responseData) this.req.write(this.responseData);
            this.req.end();
        } catch(err) {
            this.error(err);
        }
    }
    onResponse(res) {
        res.on('error', this.error.bind(this));
        this.res = res;
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && this.reDirectLimit > this.reDirectCount && res.headers.location) {
            const request = new WSC.httpRequest();
            request.streamToFile = this.streamToFile;
            request.savePath = this.savePath;
            request.handler = this.handler;
            request.reDirectCount = this.reDirectCount + 1;
            request.reDirected = true;
            request.headers = this.headers;
            request.onload = this.onload;
            request.open(this.method, res.headers.location);
            request.send(this.responseData || undefined);
            return;
        }
        if (!this.streamToFile) {
            res.on('data', chunk => {
                this.body = Buffer.concat([this.body, chunk]);
            })
            res.on('end', () => {
                const evt = {
                    target: {
                        headers: this.res.headers,
                        code: this.res.statusCode,
                        status: this.res.statusCode,
                        responseHeaders: this.res.rawHeaders,
                        responseHeadersParsed: this.res.headers,
                        response: this.body,
                        redirected: this.reDirected
                    }
                }
                if (typeof this.onload === 'function') this.onload(evt);
            })
        } else {
            if (!this.savePath.startsWith('/')) {
                this.savePath = WSC.utils.relativePath(WSC.utils.stripOffFile(this.handler.request.origpath), this.savePath);
            }
            const writeStream = this.handler.fs.createWriteStream(this.savePath);
            writeStream.on('error', this.error.bind(this));
            this.res.pipe(writeStream);
            this.res.on('end', () => {
                const evt = {
                    target: {
                        headers: this.res.headers,
                        code: this.res.statusCode,
                        status: this.res.statusCode,
                        responseHeaders: this.res.rawHeaders,
                        responseHeadersParsed: this.res.headers,
                        response: 'The response was written to a file.',
                        redirected: this.reDirected
                    }
                }
                if (typeof this.onload === 'function') this.onload(evt);
            })

        }
    }
    error(error) {
        if (typeof this.onerror === 'function') {
            this.onerror(error);
        } else if (typeof this.onload === 'function') {
            this.onload(error);
        } else {
            throw error;
        }
    }
    setupStreamToFile(handler, savePath) {
        if (!handler) throw new Error('Missing handler!');
        if (!savePath) throw new Error('Missing savePath!');
        this.streamToFile = true;
        this.handler = handler;
        this.savePath = savePath;
    }

}

function testHttpRequest() {
    let request = new httpRequest()
    request.onload = function(e) {
        console.log(e)
    }
    request.open('GET', 'http://www.google.com')
    request.send()

}

module.exports = httpRequest
