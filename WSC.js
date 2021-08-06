const path = require('path');
const fs = require('fs');
const send = require('send');
const _ = require('underscore');
const { URL } = require('url');
const http = require('http');
const https = require('https');
global.atob = require("atob");
global.Blob = require('node-blob');

WSC = {};
WSC.FileSystemUtils = { };

function BaseHandler() {
    this.headersWritten = false
    this.writingHeaders = false
    this.pendingEnd = false
    this.responseCode = null
    this.responseHeaders = {}
    this.responseLength = 0
}
_.extend(BaseHandler.prototype, {
    options: function() {
        if (this.app.opts.cors) {
            this.set_status(200)
            this.finish()
        } else {
            this.set_status(403)
            this.finish()
        }
    },
    error: function(defaultMsg, httpCode) {
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
                        file.file(function(data) {
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

                    if (_.contains(default_types, type)) {
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
        this.res.write(data)
    },
    write: function(data, code, opt_finish) {
        if (typeof data == "string") {
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
})
WSC.BaseHandler = BaseHandler

WSC.transformRequest = function(req, res, settings, callback) {
    var curRequest = WSC.HTTPRequest({headers: req.headers,
                                      method: req.method,
                                      uri: req.url,
                                      version: req.httpVersion,
                                      ip: req.socket.remoteAddress})
    var app = {
        opts: settings
    }
    if (curRequest.method.toLowerCase() != 'put') {
        req.on('data', function(chunk) {
            if (chunk && chunk != 'undefined') {
                curRequest.body = Buffer.concat([curRequest.body, chunk])
            }
        })
        req.on('end', function() {
            if (curRequest.body.byteLength == 0) {
                curRequest.body = null
            } else {
                var ct = req.headers['content-type']
                var default_charset = 'utf-8'
                if (ct) {
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
                            bodyparams[ decodeURIComponent(kv[0]) ] = decodeURIComponent(kv[1])
                        }
                        curRequest.bodyparams = bodyparams
                    }
                }
            }
            callback({request: curRequest, app: app})
        })
    } else {
        curRequest.body = null
        callback({request: curRequest, app: app})
    }
}

WSC.HTTPRequest = function(opts) {
    if (opts.uri.split('..').length > 1) {
        opts.uri = WSC.utils.relativePath(opts.uri, '')
    }
    this.method = opts.method
    this.uri = opts.uri
    this.ip = opts.ip
    this.version = opts.version
    this.headers = opts.headers
    this.body = Buffer.from('')
    this.bodyparams = null

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

WSC.HTTPRESPONSES = {
"200": "OK", 
"201": "Created", 
"202": "Accepted", 
"203": "Non-Authoritative Information", 
"204": "No Content", 
"205": "Reset Content", 
"206": "Partial Content", 
"400": "Bad Request", 
"401": "Unauthorized", 
"402": "Payment Required", 
"403": "Forbidden", 
"404": "Not Found", 
"405": "Method Not Allowed", 
"406": "Not Acceptable", 
"407": "Proxy Authentication Required", 
"408": "Request Timeout", 
"409": "Conflict", 
"410": "Gone", 
"411": "Length Required", 
"412": "Precondition Failed", 
"413": "Request Entity Too Large", 
"414": "Request-URI Too Long", 
"415": "Unsupported Media Type", 
"416": "Requested Range Not Satisfiable", 
"417": "Expectation Failed", 
"100": "Continue", 
"101": "Switching Protocols", 
"300": "Multiple Choices", 
"301": "Moved Permanently", 
"302": "Found", 
"303": "See Other", 
"304": "Not Modified", 
"305": "Use Proxy", 
"306": "(Unused)", 
"307": "Temporary Redirect", 
"500": "Internal Server Error", 
"501": "Not Implemented", 
"502": "Bad Gateway", 
"503": "Service Unavailable", 
"504": "Gateway Timeout", 
"505": "HTTP Version Not Supported"
}

var MIMETYPES = {
    "123": "application/vnd.lotus-1-2-3", 
    "3dml": "text/vnd.in3d.3dml", 
    "3ds": "image/x-3ds", 
    "3g2": "video/3gpp2", 
    "3gp": "video/3gpp", 
    "7z": "application/x-7z-compressed", 
    "aab": "application/x-authorware-bin", 
    "aac": "audio/x-aac", 
    "aam": "application/x-authorware-map", 
    "aas": "application/x-authorware-seg", 
    "abw": "application/x-abiword", 
    "ac": "application/pkix-attr-cert", 
    "acc": "application/vnd.americandynamics.acc", 
    "ace": "application/x-ace-compressed", 
    "acu": "application/vnd.acucobol", 
    "acutc": "application/vnd.acucorp", 
    "adp": "audio/adpcm", 
    "aep": "application/vnd.audiograph", 
    "afm": "application/x-font-type1", 
    "afp": "application/vnd.ibm.modcap", 
    "ahead": "application/vnd.ahead.space", 
    "ai": "application/postscript", 
    "aif": "audio/x-aiff", 
    "aifc": "audio/x-aiff", 
    "aiff": "audio/x-aiff", 
    "air": "application/vnd.adobe.air-application-installer-package+zip", 
    "ait": "application/vnd.dvb.ait", 
    "ami": "application/vnd.amiga.ami", 
    "apk": "application/vnd.android.package-archive", 
    "appcache": "text/cache-manifest", 
    "application": "application/x-ms-application", 
    "apr": "application/vnd.lotus-approach", 
    "arc": "application/x-freearc", 
    "asc": "application/pgp-signature", 
    "asf": "video/x-ms-asf", 
    "asm": "text/x-asm", 
    "aso": "application/vnd.accpac.simply.aso", 
    "asx": "video/x-ms-asf", 
    "atc": "application/vnd.acucorp", 
    "atom": "application/atom+xml", 
    "atomcat": "application/atomcat+xml", 
    "atomsvc": "application/atomsvc+xml", 
    "atx": "application/vnd.antix.game-component", 
    "au": "audio/basic", 
    "avi": "video/x-msvideo", 
    "aw": "application/applixware", 
    "azf": "application/vnd.airzip.filesecure.azf", 
    "azs": "application/vnd.airzip.filesecure.azs", 
    "azw": "application/vnd.amazon.ebook", 
    "bat": "application/x-msdownload", 
    "bcpio": "application/x-bcpio", 
    "bdf": "application/x-font-bdf", 
    "bdm": "application/vnd.syncml.dm+wbxml", 
    "bed": "application/vnd.realvnc.bed", 
    "bh2": "application/vnd.fujitsu.oasysprs", 
    "bin": "application/octet-stream", 
    "blb": "application/x-blorb", 
    "blorb": "application/x-blorb", 
    "bmi": "application/vnd.bmi", 
    "bmp": "image/bmp", 
    "book": "application/vnd.framemaker", 
    "box": "application/vnd.previewsystems.box", 
    "boz": "application/x-bzip2", 
    "bpk": "application/octet-stream", 
    "btif": "image/prs.btif", 
    "bz": "application/x-bzip", 
    "bz2": "application/x-bzip2", 
    "c": "text/x-c", 
    "c11amc": "application/vnd.cluetrust.cartomobile-config", 
    "c11amz": "application/vnd.cluetrust.cartomobile-config-pkg", 
    "c4d": "application/vnd.clonk.c4group", 
    "c4f": "application/vnd.clonk.c4group", 
    "c4g": "application/vnd.clonk.c4group", 
    "c4p": "application/vnd.clonk.c4group", 
    "c4u": "application/vnd.clonk.c4group", 
    "cab": "application/vnd.ms-cab-compressed", 
    "caf": "audio/x-caf", 
    "cap": "application/vnd.tcpdump.pcap", 
    "car": "application/vnd.curl.car", 
    "cat": "application/vnd.ms-pki.seccat", 
    "cb7": "application/x-cbr", 
    "cba": "application/x-cbr", 
    "cbr": "application/x-cbr", 
    "cbt": "application/x-cbr", 
    "cbz": "application/x-cbr", 
    "cc": "text/x-c", 
    "cct": "application/x-director", 
    "ccxml": "application/ccxml+xml", 
    "cdbcmsg": "application/vnd.contact.cmsg", 
    "cdf": "application/x-netcdf", 
    "cdkey": "application/vnd.mediastation.cdkey", 
    "cdmia": "application/cdmi-capability", 
    "cdmic": "application/cdmi-container", 
    "cdmid": "application/cdmi-domain", 
    "cdmio": "application/cdmi-object", 
    "cdmiq": "application/cdmi-queue", 
    "cdx": "chemical/x-cdx", 
    "cdxml": "application/vnd.chemdraw+xml", 
    "cdy": "application/vnd.cinderella", 
    "cer": "application/pkix-cert", 
    "cfs": "application/x-cfs-compressed", 
    "cgm": "image/cgm", 
    "chat": "application/x-chat", 
    "chm": "application/vnd.ms-htmlhelp", 
    "chrt": "application/vnd.kde.kchart", 
    "cif": "chemical/x-cif", 
    "cii": "application/vnd.anser-web-certificate-issue-initiation", 
    "cil": "application/vnd.ms-artgalry", 
    "cla": "application/vnd.claymore", 
    "class": "application/java-vm", 
    "clkk": "application/vnd.crick.clicker.keyboard", 
    "clkp": "application/vnd.crick.clicker.palette", 
    "clkt": "application/vnd.crick.clicker.template", 
    "clkw": "application/vnd.crick.clicker.wordbank", 
    "clkx": "application/vnd.crick.clicker", 
    "clp": "application/x-msclip", 
    "cmc": "application/vnd.cosmocaller", 
    "cmdf": "chemical/x-cmdf", 
    "cml": "chemical/x-cml", 
    "cmp": "application/vnd.yellowriver-custom-menu", 
    "cmx": "image/x-cmx", 
    "cod": "application/vnd.rim.cod", 
    "com": "application/x-msdownload", 
    "conf": "text/plain", 
    "cpio": "application/x-cpio", 
    "cpp": "text/x-c", 
    "cpt": "application/mac-compactpro", 
    "crd": "application/x-mscardfile", 
    "crl": "application/pkix-crl", 
    "crt": "application/x-x509-ca-cert", 
    "cryptonote": "application/vnd.rig.cryptonote", 
    "csh": "application/x-csh", 
    "csml": "chemical/x-csml", 
    "csp": "application/vnd.commonspace", 
    "css": "text/css", 
    "cst": "application/x-director", 
    "csv": "text/csv", 
    "cu": "application/cu-seeme", 
    "curl": "text/vnd.curl", 
    "cww": "application/prs.cww", 
    "cxt": "application/x-director", 
    "cxx": "text/x-c", 
    "dae": "model/vnd.collada+xml", 
    "daf": "application/vnd.mobius.daf", 
    "dart": "application/vnd.dart", 
    "dataless": "application/vnd.fdsn.seed", 
    "davmount": "application/davmount+xml", 
    "dbk": "application/docbook+xml", 
    "dcr": "application/x-director", 
    "dcurl": "text/vnd.curl.dcurl", 
    "dd2": "application/vnd.oma.dd2+xml", 
    "ddd": "application/vnd.fujixerox.ddd", 
    "deb": "application/x-debian-package", 
    "def": "text/plain", 
    "deploy": "application/octet-stream", 
    "der": "application/x-x509-ca-cert", 
    "dfac": "application/vnd.dreamfactory", 
    "dgc": "application/x-dgc-compressed", 
    "dic": "text/x-c", 
    "dir": "application/x-director", 
    "dis": "application/vnd.mobius.dis", 
    "dist": "application/octet-stream", 
    "distz": "application/octet-stream", 
    "djv": "image/vnd.djvu", 
    "djvu": "image/vnd.djvu", 
    "dll": "application/x-msdownload", 
    "dmg": "application/x-apple-diskimage", 
    "dmp": "application/vnd.tcpdump.pcap", 
    "dms": "application/octet-stream", 
    "dna": "application/vnd.dna", 
    "doc": "application/msword", 
    "docm": "application/vnd.ms-word.document.macroenabled.12", 
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
    "dot": "application/msword", 
    "dotm": "application/vnd.ms-word.template.macroenabled.12", 
    "dotx": "application/vnd.openxmlformats-officedocument.wordprocessingml.template", 
    "dp": "application/vnd.osgi.dp", 
    "dpg": "application/vnd.dpgraph", 
    "dra": "audio/vnd.dra", 
    "dsc": "text/prs.lines.tag", 
    "dssc": "application/dssc+der", 
    "dtb": "application/x-dtbook+xml", 
    "dtd": "application/xml-dtd", 
    "dts": "audio/vnd.dts", 
    "dtshd": "audio/vnd.dts.hd", 
    "dump": "application/octet-stream", 
    "dvb": "video/vnd.dvb.file", 
    "dvi": "application/x-dvi", 
    "dwf": "model/vnd.dwf", 
    "dwg": "image/vnd.dwg", 
    "dxf": "image/vnd.dxf", 
    "dxp": "application/vnd.spotfire.dxp", 
    "dxr": "application/x-director", 
    "ecelp4800": "audio/vnd.nuera.ecelp4800", 
    "ecelp7470": "audio/vnd.nuera.ecelp7470", 
    "ecelp9600": "audio/vnd.nuera.ecelp9600", 
    "ecma": "application/ecmascript", 
    "edm": "application/vnd.novadigm.edm", 
    "edx": "application/vnd.novadigm.edx", 
    "efif": "application/vnd.picsel", 
    "ei6": "application/vnd.pg.osasli", 
    "elc": "application/octet-stream", 
    "emf": "application/x-msmetafile", 
    "eml": "message/rfc822", 
    "emma": "application/emma+xml", 
    "emz": "application/x-msmetafile", 
    "eol": "audio/vnd.digital-winds", 
    "eot": "application/vnd.ms-fontobject", 
    "eps": "application/postscript", 
    "epub": "application/epub+zip", 
    "es3": "application/vnd.eszigno3+xml", 
    "esa": "application/vnd.osgi.subsystem", 
    "esf": "application/vnd.epson.esf", 
    "et3": "application/vnd.eszigno3+xml", 
    "etx": "text/x-setext", 
    "eva": "application/x-eva", 
    "evy": "application/x-envoy", 
    "exe": "application/x-msdownload", 
    "exi": "application/exi", 
    "ext": "application/vnd.novadigm.ext", 
    "ez": "application/andrew-inset", 
    "ez2": "application/vnd.ezpix-album", 
    "ez3": "application/vnd.ezpix-package", 
    "f": "text/x-fortran", 
    "f4v": "video/x-f4v", 
    "f77": "text/x-fortran", 
    "f90": "text/x-fortran", 
    "fbs": "image/vnd.fastbidsheet", 
    "fcdt": "application/vnd.adobe.formscentral.fcdt", 
    "fcs": "application/vnd.isac.fcs", 
    "fdf": "application/vnd.fdf", 
    "fe_launch": "application/vnd.denovo.fcselayout-link", 
    "fg5": "application/vnd.fujitsu.oasysgp", 
    "fgd": "application/x-director", 
    "fh": "image/x-freehand", 
    "fh4": "image/x-freehand", 
    "fh5": "image/x-freehand", 
    "fh7": "image/x-freehand", 
    "fhc": "image/x-freehand", 
    "fig": "application/x-xfig", 
    "flac": "audio/x-flac", 
    "fli": "video/x-fli", 
    "flo": "application/vnd.micrografx.flo", 
    "flv": "video/x-flv", 
    "flw": "application/vnd.kde.kivio", 
    "flx": "text/vnd.fmi.flexstor", 
    "fly": "text/vnd.fly", 
    "fm": "application/vnd.framemaker", 
    "fnc": "application/vnd.frogans.fnc", 
    "for": "text/x-fortran", 
    "fpx": "image/vnd.fpx", 
    "frame": "application/vnd.framemaker", 
    "fsc": "application/vnd.fsc.weblaunch", 
    "fst": "image/vnd.fst", 
    "ftc": "application/vnd.fluxtime.clip", 
    "fti": "application/vnd.anser-web-funds-transfer-initiation", 
    "fvt": "video/vnd.fvt", 
    "fxp": "application/vnd.adobe.fxp", 
    "fxpl": "application/vnd.adobe.fxp", 
    "fzs": "application/vnd.fuzzysheet", 
    "g2w": "application/vnd.geoplan", 
    "g3": "image/g3fax", 
    "g3w": "application/vnd.geospace", 
    "gac": "application/vnd.groove-account", 
    "gam": "application/x-tads", 
    "gbr": "application/rpki-ghostbusters", 
    "gca": "application/x-gca-compressed", 
    "gdl": "model/vnd.gdl", 
    "geo": "application/vnd.dynageo", 
    "gex": "application/vnd.geometry-explorer", 
    "ggb": "application/vnd.geogebra.file", 
    "ggt": "application/vnd.geogebra.tool", 
    "ghf": "application/vnd.groove-help", 
    "gif": "image/gif", 
    "gim": "application/vnd.groove-identity-message", 
    "gml": "application/gml+xml", 
    "gmx": "application/vnd.gmx", 
    "gnumeric": "application/x-gnumeric", 
    "gph": "application/vnd.flographit", 
    "gpx": "application/gpx+xml", 
    "gqf": "application/vnd.grafeq", 
    "gqs": "application/vnd.grafeq", 
    "gram": "application/srgs", 
    "gramps": "application/x-gramps-xml", 
    "gre": "application/vnd.geometry-explorer", 
    "grv": "application/vnd.groove-injector", 
    "grxml": "application/srgs+xml", 
    "gsf": "application/x-font-ghostscript", 
    "gtar": "application/x-gtar", 
    "gtm": "application/vnd.groove-tool-message", 
    "gtw": "model/vnd.gtw", 
    "gv": "text/vnd.graphviz", 
    "gxf": "application/gxf", 
    "gxt": "application/vnd.geonext", 
    "gz": "application/gzip", 
    "h": "text/x-c", 
    "h261": "video/h261", 
    "h263": "video/h263", 
    "h264": "video/h264", 
    "hal": "application/vnd.hal+xml", 
    "hbci": "application/vnd.hbci", 
    "hdf": "application/x-hdf", 
    "hh": "text/x-c", 
    "hlp": "application/winhlp", 
    "hpgl": "application/vnd.hp-hpgl", 
    "hpid": "application/vnd.hp-hpid", 
    "hps": "application/vnd.hp-hps", 
    "hqx": "application/mac-binhex40", 
    "htke": "application/vnd.kenameaapp", 
    "htm": "text/html", 
    "html": "text/html", 
    "hvd": "application/vnd.yamaha.hv-dic", 
    "hvp": "application/vnd.yamaha.hv-voice", 
    "hvs": "application/vnd.yamaha.hv-script", 
    "i2g": "application/vnd.intergeo", 
    "icc": "application/vnd.iccprofile", 
    "ice": "x-conference/x-cooltalk", 
    "icm": "application/vnd.iccprofile", 
    "ico": "image/x-icon", 
    "ics": "text/calendar", 
    "ief": "image/ief", 
    "ifb": "text/calendar", 
    "ifm": "application/vnd.shana.informed.formdata", 
    "iges": "model/iges", 
    "igl": "application/vnd.igloader", 
    "igm": "application/vnd.insors.igm", 
    "igs": "model/iges", 
    "igx": "application/vnd.micrografx.igx", 
    "iif": "application/vnd.shana.informed.interchange", 
    "imp": "application/vnd.accpac.simply.imp", 
    "ims": "application/vnd.ms-ims", 
    "in": "text/plain", 
    "ink": "application/inkml+xml", 
    "inkml": "application/inkml+xml", 
    "install": "application/x-install-instructions", 
    "iota": "application/vnd.astraea-software.iota", 
    "ipfix": "application/ipfix", 
    "ipk": "application/vnd.shana.informed.package", 
    "irm": "application/vnd.ibm.rights-management", 
    "irp": "application/vnd.irepository.package+xml", 
    "iso": "application/x-iso9660-image", 
    "itp": "application/vnd.shana.informed.formtemplate", 
    "ivp": "application/vnd.immervision-ivp", 
    "ivu": "application/vnd.immervision-ivu", 
    "jad": "text/vnd.sun.j2me.app-descriptor", 
    "jam": "application/vnd.jam", 
    "jar": "application/java-archive", 
    "java": "text/x-java-source", 
    "jisp": "application/vnd.jisp", 
    "jlt": "application/vnd.hp-jlyt", 
    "jnlp": "application/x-java-jnlp-file", 
    "joda": "application/vnd.joost.joda-archive", 
    "jpe": "image/jpeg", 
    "jpeg": "image/jpeg", 
    "jpg": "image/jpeg", 
    "jpgm": "video/jpm", 
    "jpgv": "video/jpeg", 
    "jpm": "video/jpm", 
    "js": "application/javascript", 
    "json": "application/json", 
    "jsonml": "application/jsonml+json", 
    "kar": "audio/midi", 
    "karbon": "application/vnd.kde.karbon", 
    "kfo": "application/vnd.kde.kformula", 
    "kia": "application/vnd.kidspiration", 
    "kml": "application/vnd.google-earth.kml+xml", 
    "kmz": "application/vnd.google-earth.kmz", 
    "kne": "application/vnd.kinar", 
    "knp": "application/vnd.kinar", 
    "kon": "application/vnd.kde.kontour", 
    "kpr": "application/vnd.kde.kpresenter", 
    "kpt": "application/vnd.kde.kpresenter", 
    "kpxx": "application/vnd.ds-keypoint", 
    "ksp": "application/vnd.kde.kspread", 
    "ktr": "application/vnd.kahootz", 
    "ktx": "image/ktx", 
    "ktz": "application/vnd.kahootz", 
    "kwd": "application/vnd.kde.kword", 
    "kwt": "application/vnd.kde.kword", 
    "lasxml": "application/vnd.las.las+xml", 
    "latex": "application/x-latex", 
    "lbd": "application/vnd.llamagraphics.life-balance.desktop", 
    "lbe": "application/vnd.llamagraphics.life-balance.exchange+xml", 
    "les": "application/vnd.hhe.lesson-player", 
    "lha": "application/x-lzh-compressed", 
    "link66": "application/vnd.route66.link66+xml", 
    "list": "text/plain", 
    "list3820": "application/vnd.ibm.modcap", 
    "listafp": "application/vnd.ibm.modcap", 
    "lnk": "application/x-ms-shortcut", 
    "log": "text/plain", 
    "lostxml": "application/lost+xml", 
    "lrf": "application/octet-stream", 
    "lrm": "application/vnd.ms-lrm", 
    "ltf": "application/vnd.frogans.ltf", 
    "lvp": "audio/vnd.lucent.voice", 
    "lwp": "application/vnd.lotus-wordpro", 
    "lzh": "application/x-lzh-compressed", 
    "m13": "application/x-msmediaview", 
    "m14": "application/x-msmediaview", 
    "m1v": "video/mpeg", 
    "m21": "application/mp21", 
    "m2a": "audio/mpeg", 
    "m2v": "video/mpeg", 
    "m3a": "audio/mpeg", 
    "m3u": "audio/x-mpegurl", 
    "m3u8": "application/vnd.apple.mpegurl", 
    "m4u": "video/vnd.mpegurl", 
    "m4v": "video/x-m4v", 
    "ma": "application/mathematica", 
    "mads": "application/mads+xml", 
    "mag": "application/vnd.ecowin.chart", 
    "maker": "application/vnd.framemaker", 
    "man": "text/troff", 
    "mar": "application/octet-stream", 
    "mathml": "application/mathml+xml", 
    "mb": "application/mathematica", 
    "mbk": "application/vnd.mobius.mbk", 
    "mbox": "application/mbox", 
    "mc1": "application/vnd.medcalcdata", 
    "mcd": "application/vnd.mcd", 
    "mcurl": "text/vnd.curl.mcurl", 
    "mdb": "application/x-msaccess", 
    "mdi": "image/vnd.ms-modi", 
    "me": "text/troff", 
    "mesh": "model/mesh", 
    "meta4": "application/metalink4+xml", 
    "metalink": "application/metalink+xml", 
    "mets": "application/mets+xml", 
    "mfm": "application/vnd.mfmp", 
    "mft": "application/rpki-manifest", 
    "mgp": "application/vnd.osgeo.mapguide.package", 
    "mgz": "application/vnd.proteus.magazine", 
    "mid": "audio/midi", 
    "midi": "audio/midi", 
    "mie": "application/x-mie", 
    "mif": "application/vnd.mif", 
    "mime": "message/rfc822", 
    "mj2": "video/mj2", 
    "mjp2": "video/mj2",
    "mjs": "application/javascript", 
    "mk3d": "video/x-matroska", 
    "mka": "audio/x-matroska", 
    "mks": "video/x-matroska", 
    "mkv": "video/x-matroska", 
    "mlp": "application/vnd.dolby.mlp", 
    "mmd": "application/vnd.chipnuts.karaoke-mmd", 
    "mmf": "application/vnd.smaf", 
    "mmr": "image/vnd.fujixerox.edmics-mmr", 
    "mng": "video/x-mng", 
    "mny": "application/x-msmoney", 
    "mobi": "application/x-mobipocket-ebook", 
    "mods": "application/mods+xml", 
    "mov": "video/quicktime", 
    "movie": "video/x-sgi-movie", 
    "mp2": "audio/mpeg", 
    "mp21": "application/mp21", 
    "mp2a": "audio/mpeg", 
    "mp3": "audio/mpeg", 
    "mp4": "video/mp4", 
    "mp4a": "audio/mp4", 
    "mp4s": "application/mp4", 
    "mp4v": "video/mp4", 
    "mpc": "application/vnd.mophun.certificate", 
    "mpe": "video/mpeg", 
    "mpeg": "video/mpeg", 
    "mpg": "video/mpeg", 
    "mpg4": "video/mp4", 
    "mpga": "audio/mpeg", 
    "mpkg": "application/vnd.apple.installer+xml", 
    "mpm": "application/vnd.blueice.multipass", 
    "mpn": "application/vnd.mophun.application", 
    "mpp": "application/vnd.ms-project", 
    "mpt": "application/vnd.ms-project", 
    "mpy": "application/vnd.ibm.minipay", 
    "mqy": "application/vnd.mobius.mqy", 
    "mrc": "application/marc", 
    "mrcx": "application/marcxml+xml", 
    "ms": "text/troff", 
    "mscml": "application/mediaservercontrol+xml", 
    "mseed": "application/vnd.fdsn.mseed", 
    "mseq": "application/vnd.mseq", 
    "msf": "application/vnd.epson.msf", 
    "msh": "model/mesh", 
    "msi": "application/x-msdownload", 
    "msl": "application/vnd.mobius.msl", 
    "msty": "application/vnd.muvee.style", 
    "mts": "model/vnd.mts", 
    "mus": "application/vnd.musician", 
    "musicxml": "application/vnd.recordare.musicxml+xml", 
    "mvb": "application/x-msmediaview", 
    "mwf": "application/vnd.mfer", 
    "mxf": "application/mxf", 
    "mxl": "application/vnd.recordare.musicxml", 
    "mxml": "application/xv+xml", 
    "mxs": "application/vnd.triscape.mxs", 
    "mxu": "video/vnd.mpegurl", 
    "n-gage": "application/vnd.nokia.n-gage.symbian.install", 
    "n3": "text/n3", 
    "nb": "application/mathematica", 
    "nbp": "application/vnd.wolfram.player", 
    "nc": "application/x-netcdf", 
    "ncx": "application/x-dtbncx+xml", 
    "nfo": "text/x-nfo", 
    "ngdat": "application/vnd.nokia.n-gage.data", 
    "nitf": "application/vnd.nitf", 
    "nlu": "application/vnd.neurolanguage.nlu", 
    "nml": "application/vnd.enliven", 
    "nnd": "application/vnd.noblenet-directory", 
    "nns": "application/vnd.noblenet-sealer", 
    "nnw": "application/vnd.noblenet-web", 
    "npx": "image/vnd.net-fpx", 
    "nsc": "application/x-conference", 
    "nsf": "application/vnd.lotus-notes", 
    "ntf": "application/vnd.nitf", 
    "nzb": "application/x-nzb", 
    "oa2": "application/vnd.fujitsu.oasys2", 
    "oa3": "application/vnd.fujitsu.oasys3", 
    "oas": "application/vnd.fujitsu.oasys", 
    "obd": "application/x-msbinder", 
    "obj": "application/x-tgif", 
    "oda": "application/oda", 
    "odb": "application/vnd.oasis.opendocument.database", 
    "odc": "application/vnd.oasis.opendocument.chart", 
    "odf": "application/vnd.oasis.opendocument.formula", 
    "odft": "application/vnd.oasis.opendocument.formula-template", 
    "odg": "application/vnd.oasis.opendocument.graphics", 
    "odi": "application/vnd.oasis.opendocument.image", 
    "odm": "application/vnd.oasis.opendocument.text-master", 
    "odp": "application/vnd.oasis.opendocument.presentation", 
    "ods": "application/vnd.oasis.opendocument.spreadsheet", 
    "odt": "application/vnd.oasis.opendocument.text", 
    "oga": "audio/ogg", 
    "ogg": "audio/ogg", 
    "ogv": "video/ogg", 
    "ogx": "application/ogg", 
    "omdoc": "application/omdoc+xml", 
    "onepkg": "application/onenote", 
    "onetmp": "application/onenote", 
    "onetoc": "application/onenote", 
    "onetoc2": "application/onenote", 
    "opf": "application/oebps-package+xml", 
    "opml": "text/x-opml", 
    "oprc": "application/vnd.palm", 
    "org": "application/vnd.lotus-organizer", 
    "osf": "application/vnd.yamaha.openscoreformat", 
    "osfpvg": "application/vnd.yamaha.openscoreformat.osfpvg+xml", 
    "otc": "application/vnd.oasis.opendocument.chart-template", 
    "otf": "application/x-font-otf", 
    "otg": "application/vnd.oasis.opendocument.graphics-template", 
    "oth": "application/vnd.oasis.opendocument.text-web", 
    "oti": "application/vnd.oasis.opendocument.image-template", 
    "otp": "application/vnd.oasis.opendocument.presentation-template", 
    "ots": "application/vnd.oasis.opendocument.spreadsheet-template", 
    "ott": "application/vnd.oasis.opendocument.text-template", 
    "oxps": "application/oxps", 
    "oxt": "application/vnd.openofficeorg.extension", 
    "p": "text/x-pascal", 
    "p10": "application/pkcs10", 
    "p12": "application/x-pkcs12", 
    "p7b": "application/x-pkcs7-certificates", 
    "p7c": "application/pkcs7-mime", 
    "p7m": "application/pkcs7-mime", 
    "p7r": "application/x-pkcs7-certreqresp", 
    "p7s": "application/pkcs7-signature", 
    "p8": "application/pkcs8", 
    "pas": "text/x-pascal", 
    "paw": "application/vnd.pawaafile", 
    "pbd": "application/vnd.powerbuilder6", 
    "pbm": "image/x-portable-bitmap", 
    "pcap": "application/vnd.tcpdump.pcap", 
    "pcf": "application/x-font-pcf", 
    "pcl": "application/vnd.hp-pcl", 
    "pclxl": "application/vnd.hp-pclxl", 
    "pct": "image/x-pict", 
    "pcurl": "application/vnd.curl.pcurl", 
    "pcx": "image/x-pcx", 
    "pdb": "application/vnd.palm", 
    "pdf": "application/pdf", 
    "pfa": "application/x-font-type1", 
    "pfb": "application/x-font-type1", 
    "pfm": "application/x-font-type1", 
    "pfr": "application/font-tdpfr", 
    "pfx": "application/x-pkcs12", 
    "pgm": "image/x-portable-graymap", 
    "pgn": "application/x-chess-pgn", 
    "pgp": "application/pgp-encrypted", 
    "pic": "image/x-pict", 
    "pkg": "application/octet-stream", 
    "pki": "application/pkixcmp", 
    "pkipath": "application/pkix-pkipath", 
    "plb": "application/vnd.3gpp.pic-bw-large", 
    "plc": "application/vnd.mobius.plc", 
    "plf": "application/vnd.pocketlearn", 
    "pls": "application/pls+xml", 
    "pmd":"application/x-pmd" ,
    "pml": "application/vnd.ctc-posml", 
    "png": "image/png", 
    "pnm": "image/x-portable-anymap", 
    "portpkg": "application/vnd.macports.portpkg", 
    "pot": "application/vnd.ms-powerpoint", 
    "potm": "application/vnd.ms-powerpoint.template.macroenabled.12", 
    "potx": "application/vnd.openxmlformats-officedocument.presentationml.template", 
    "ppam": "application/vnd.ms-powerpoint.addin.macroenabled.12", 
    "ppd": "application/vnd.cups-ppd", 
    "ppm": "image/x-portable-pixmap", 
    "pps": "application/vnd.ms-powerpoint", 
    "ppsm": "application/vnd.ms-powerpoint.slideshow.macroenabled.12", 
    "ppsx": "application/vnd.openxmlformats-officedocument.presentationml.slideshow", 
    "ppt": "application/vnd.ms-powerpoint", 
    "pptm": "application/vnd.ms-powerpoint.presentation.macroenabled.12", 
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", 
    "pqa": "application/vnd.palm", 
    "prc": "application/x-mobipocket-ebook", 
    "pre": "application/vnd.lotus-freelance", 
    "prf": "application/pics-rules", 
    "ps": "application/postscript", 
    "psb": "application/vnd.3gpp.pic-bw-small", 
    "psd": "image/vnd.adobe.photoshop", 
    "psf": "application/x-font-linux-psf", 
    "pskcxml": "application/pskc+xml", 
    "ptid": "application/vnd.pvi.ptid1", 
    "pub": "application/x-mspublisher", 
    "pvb": "application/vnd.3gpp.pic-bw-var", 
    "pwn": "application/vnd.3m.post-it-notes", 
    "pya": "audio/vnd.ms-playready.media.pya", 
    "pyv": "video/vnd.ms-playready.media.pyv", 
    "qam": "application/vnd.epson.quickanime", 
    "qbo": "application/vnd.intu.qbo", 
    "qfx": "application/vnd.intu.qfx", 
    "qps": "application/vnd.publishare-delta-tree", 
    "qt": "video/quicktime", 
    "qwd": "application/vnd.quark.quarkxpress", 
    "qwt": "application/vnd.quark.quarkxpress", 
    "qxb": "application/vnd.quark.quarkxpress", 
    "qxd": "application/vnd.quark.quarkxpress", 
    "qxl": "application/vnd.quark.quarkxpress", 
    "qxt": "application/vnd.quark.quarkxpress", 
    "ra": "audio/x-pn-realaudio", 
    "ram": "audio/x-pn-realaudio", 
    "rar": "application/x-rar-compressed", 
    "ras": "image/x-cmu-raster", 
    "rcprofile": "application/vnd.ipunplugged.rcprofile", 
    "rdf": "application/rdf+xml", 
    "rdz": "application/vnd.data-vision.rdz", 
    "rep": "application/vnd.businessobjects", 
    "res": "application/x-dtbresource+xml", 
    "rgb": "image/x-rgb", 
    "rif": "application/reginfo+xml", 
    "rip": "audio/vnd.rip", 
    "ris": "application/x-research-info-systems", 
    "rl": "application/resource-lists+xml", 
    "rlc": "image/vnd.fujixerox.edmics-rlc", 
    "rld": "application/resource-lists-diff+xml", 
    "rm": "application/vnd.rn-realmedia", 
    "rmi": "audio/midi", 
    "rmp": "audio/x-pn-realaudio-plugin", 
    "rms": "application/vnd.jcp.javame.midlet-rms", 
    "rmvb": "application/vnd.rn-realmedia-vbr", 
    "rnc": "application/relax-ng-compact-syntax", 
    "roa": "application/rpki-roa", 
    "roff": "text/troff", 
    "rp9": "application/vnd.cloanto.rp9", 
    "rpss": "application/vnd.nokia.radio-presets", 
    "rpst": "application/vnd.nokia.radio-preset", 
    "rq": "application/sparql-query", 
    "rs": "application/rls-services+xml", 
    "rsd": "application/rsd+xml", 
    "rss": "application/rss+xml", 
    "rtf": "application/rtf", 
    "rtx": "text/richtext", 
    "s": "text/x-asm", 
    "s3m": "audio/s3m", 
    "saf": "application/vnd.yamaha.smaf-audio", 
    "sbml": "application/sbml+xml", 
    "sc": "application/vnd.ibm.secure-container", 
    "scd": "application/x-msschedule", 
    "scm": "application/vnd.lotus-screencam", 
    "scq": "application/scvp-cv-request", 
    "scs": "application/scvp-cv-response", 
    "scurl": "text/vnd.curl.scurl", 
    "sda": "application/vnd.stardivision.draw", 
    "sdc": "application/vnd.stardivision.calc", 
    "sdd": "application/vnd.stardivision.impress", 
    "sdkd": "application/vnd.solent.sdkm+xml", 
    "sdkm": "application/vnd.solent.sdkm+xml", 
    "sdp": "application/sdp", 
    "sdw": "application/vnd.stardivision.writer", 
    "see": "application/vnd.seemail", 
    "seed": "application/vnd.fdsn.seed", 
    "sema": "application/vnd.sema", 
    "semd": "application/vnd.semd", 
    "semf": "application/vnd.semf", 
    "ser": "application/java-serialized-object", 
    "setpay": "application/set-payment-initiation", 
    "setreg": "application/set-registration-initiation", 
    "sfd-hdstx": "application/vnd.hydrostatix.sof-data", 
    "sfs": "application/vnd.spotfire.sfs", 
    "sfv": "text/x-sfv", 
    "sgi": "image/sgi", 
    "sgl": "application/vnd.stardivision.writer-global", 
    "sgm": "text/sgml", 
    "sgml": "text/sgml", 
    "sh": "application/x-sh", 
    "shar": "application/x-shar", 
    "shf": "application/shf+xml", 
    "sid": "image/x-mrsid-image", 
    "sig": "application/pgp-signature", 
    "sil": "audio/silk", 
    "silo": "model/mesh", 
    "sis": "application/vnd.symbian.install", 
    "sisx": "application/vnd.symbian.install", 
    "sit": "application/x-stuffit", 
    "sitx": "application/x-stuffitx", 
    "skd": "application/vnd.koan", 
    "skm": "application/vnd.koan", 
    "skp": "application/vnd.koan", 
    "skt": "application/vnd.koan", 
    "sldm": "application/vnd.ms-powerpoint.slide.macroenabled.12", 
    "sldx": "application/vnd.openxmlformats-officedocument.presentationml.slide", 
    "slt": "application/vnd.epson.salt", 
    "sm": "application/vnd.stepmania.stepchart", 
    "smf": "application/vnd.stardivision.math", 
    "smi": "application/smil+xml", 
    "smil": "application/smil+xml", 
    "smv": "video/x-smv", 
    "smzip": "application/vnd.stepmania.package", 
    "snd": "audio/basic", 
    "snf": "application/x-font-snf", 
    "so": "application/octet-stream", 
    "spc": "application/x-pkcs7-certificates", 
    "spf": "application/vnd.yamaha.smaf-phrase", 
    "spl": "application/x-futuresplash", 
    "spot": "text/vnd.in3d.spot", 
    "spp": "application/scvp-vp-response", 
    "spq": "application/scvp-vp-request", 
    "spx": "audio/ogg", 
    "sql": "application/x-sql", 
    "src": "application/x-wais-source", 
    "srt": "application/x-subrip", 
    "sru": "application/sru+xml", 
    "srx": "application/sparql-results+xml", 
    "ssdl": "application/ssdl+xml", 
    "sse": "application/vnd.kodak-descriptor", 
    "ssf": "application/vnd.epson.ssf", 
    "ssml": "application/ssml+xml", 
    "st": "application/vnd.sailingtracker.track", 
    "stc": "application/vnd.sun.xml.calc.template", 
    "std": "application/vnd.sun.xml.draw.template", 
    "stf": "application/vnd.wt.stf", 
    "sti": "application/vnd.sun.xml.impress.template", 
    "stk": "application/hyperstudio", 
    "stl": "application/vnd.ms-pki.stl", 
    "str": "application/vnd.pg.format", 
    "stw": "application/vnd.sun.xml.writer.template", 
    "sub": "text/vnd.dvb.subtitle", 
    "sus": "application/vnd.sus-calendar", 
    "susp": "application/vnd.sus-calendar", 
    "sv4cpio": "application/x-sv4cpio", 
    "sv4crc": "application/x-sv4crc", 
    "svc": "application/vnd.dvb.service", 
    "svd": "application/vnd.svd", 
    "svg": "image/svg+xml", 
    "svgz": "image/svg+xml", 
    "swa": "application/x-director", 
    "swf": "application/x-shockwave-flash", 
    "swi": "application/vnd.aristanetworks.swi", 
    "sxc": "application/vnd.sun.xml.calc", 
    "sxd": "application/vnd.sun.xml.draw", 
    "sxg": "application/vnd.sun.xml.writer.global", 
    "sxi": "application/vnd.sun.xml.impress", 
    "sxm": "application/vnd.sun.xml.math", 
    "sxw": "application/vnd.sun.xml.writer", 
    "t": "text/troff", 
    "t3": "application/x-t3vm-image", 
    "taglet": "application/vnd.mynfc", 
    "tao": "application/vnd.tao.intent-module-archive", 
    "tar": "application/x-tar", 
    "tcap": "application/vnd.3gpp2.tcap", 
    "tcl": "application/x-tcl", 
    "teacher": "application/vnd.smart.teacher", 
    "tei": "application/tei+xml", 
    "teicorpus": "application/tei+xml", 
    "tex": "application/x-tex", 
    "texi": "application/x-texinfo", 
    "texinfo": "application/x-texinfo", 
    "text": "text/plain", 
    "tfi": "application/thraud+xml", 
    "tfm": "application/x-tex-tfm", 
    "tga": "image/x-tga", 
    "thmx": "application/vnd.ms-officetheme", 
    "tif": "image/tiff", 
    "tiff": "image/tiff", 
    "tmo": "application/vnd.tmobile-livetv", 
    "torrent": "application/x-bittorrent", 
    "tpl": "application/vnd.groove-tool-template", 
    "tpt": "application/vnd.trid.tpt", 
    "tr": "text/troff", 
    "tra": "application/vnd.trueapp", 
    "trm": "application/x-msterminal", 
    "tsd": "application/timestamped-data", 
    "tsv": "text/tab-separated-values", 
    "ttc": "application/x-font-ttf", 
    "ttf": "application/x-font-ttf", 
    "ttl": "text/turtle", 
    "twd": "application/vnd.simtech-mindmapper", 
    "twds": "application/vnd.simtech-mindmapper", 
    "txd": "application/vnd.genomatix.tuxedo", 
    "txf": "application/vnd.mobius.txf", 
    "txt": "text/plain", 
    "u32": "application/x-authorware-bin", 
    "udeb": "application/x-debian-package", 
    "ufd": "application/vnd.ufdl", 
    "ufdl": "application/vnd.ufdl", 
    "ulx": "application/x-glulx", 
    "umj": "application/vnd.umajin", 
    "unityweb": "application/vnd.unity", 
    "uoml": "application/vnd.uoml+xml", 
    "uri": "text/uri-list", 
    "uris": "text/uri-list", 
    "urls": "text/uri-list", 
    "ustar": "application/x-ustar", 
    "utz": "application/vnd.uiq.theme", 
    "uu": "text/x-uuencode", 
    "uva": "audio/vnd.dece.audio", 
    "uvd": "application/vnd.dece.data", 
    "uvf": "application/vnd.dece.data", 
    "uvg": "image/vnd.dece.graphic", 
    "uvh": "video/vnd.dece.hd", 
    "uvi": "image/vnd.dece.graphic", 
    "uvm": "video/vnd.dece.mobile", 
    "uvp": "video/vnd.dece.pd", 
    "uvs": "video/vnd.dece.sd", 
    "uvt": "application/vnd.dece.ttml+xml", 
    "uvu": "video/vnd.uvvu.mp4", 
    "uvv": "video/vnd.dece.video", 
    "uvva": "audio/vnd.dece.audio", 
    "uvvd": "application/vnd.dece.data", 
    "uvvf": "application/vnd.dece.data", 
    "uvvg": "image/vnd.dece.graphic", 
    "uvvh": "video/vnd.dece.hd", 
    "uvvi": "image/vnd.dece.graphic", 
    "uvvm": "video/vnd.dece.mobile", 
    "uvvp": "video/vnd.dece.pd", 
    "uvvs": "video/vnd.dece.sd", 
    "uvvt": "application/vnd.dece.ttml+xml", 
    "uvvu": "video/vnd.uvvu.mp4", 
    "uvvv": "video/vnd.dece.video", 
    "uvvx": "application/vnd.dece.unspecified", 
    "uvvz": "application/vnd.dece.zip", 
    "uvx": "application/vnd.dece.unspecified", 
    "uvz": "application/vnd.dece.zip", 
    "vcard": "text/vcard", 
    "vcd": "application/x-cdlink", 
    "vcf": "text/x-vcard", 
    "vcg": "application/vnd.groove-vcard", 
    "vcs": "text/x-vcalendar", 
    "vcx": "application/vnd.vcx", 
    "vis": "application/vnd.visionary", 
    "viv": "video/vnd.vivo", 
    "vmd":"application/vocaltec-media-desc" ,
    "vob": "video/x-ms-vob", 
    "vor": "application/vnd.stardivision.writer", 
    "vox": "application/x-authorware-bin", 
    "vrml": "model/vrml", 
    "vsd": "application/vnd.visio", 
    "vsf": "application/vnd.vsf", 
    "vss": "application/vnd.visio", 
    "vst": "application/vnd.visio", 
    "vsw": "application/vnd.visio", 
    "vtu": "model/vnd.vtu",
    "vtt": "text/vtt",
    "vxml": "application/voicexml+xml", 
    "w3d": "application/x-director", 
    "wad": "application/x-doom", 
    "wasm": "application/wasm", 
    "wav": "audio/x-wav", 
    "wax": "audio/x-ms-wax", 
    "wbmp": "image/vnd.wap.wbmp", 
    "wbs": "application/vnd.criticaltools.wbs+xml", 
    "wbxml": "application/vnd.wap.wbxml", 
    "wcm": "application/vnd.ms-works", 
    "wdb": "application/vnd.ms-works", 
    "wdp": "image/vnd.ms-photo", 
    "weba": "audio/webm", 
    "webm": "video/webm", 
    "webp": "image/webp", 
    "wg": "application/vnd.pmi.widget", 
    "wgt": "application/widget", 
    "wks": "application/vnd.ms-works", 
    "wm": "video/x-ms-wm", 
    "wma": "audio/x-ms-wma", 
    "wmd": "application/x-ms-wmd", 
    "wmf": "application/x-msmetafile", 
    "wml": "text/vnd.wap.wml", 
    "wmlc": "application/vnd.wap.wmlc", 
    "wmls": "text/vnd.wap.wmlscript", 
    "wmlsc": "application/vnd.wap.wmlscriptc", 
    "wmv": "video/x-ms-wmv", 
    "wmx": "video/x-ms-wmx", 
    "wmz": "application/x-msmetafile", 
    "woff": "application/x-font-woff", 
    "wpd": "application/vnd.wordperfect", 
    "wpl": "application/vnd.ms-wpl", 
    "wps": "application/vnd.ms-works", 
    "wqd": "application/vnd.wqd", 
    "wri": "application/x-mswrite", 
    "wrl": "model/vrml", 
    "wsdl": "application/wsdl+xml", 
    "wspolicy": "application/wspolicy+xml", 
    "wtb": "application/vnd.webturbo", 
    "wvx": "video/x-ms-wvx", 
    "x32": "application/x-authorware-bin", 
    "x3d": "model/x3d+xml", 
    "x3db": "model/x3d+binary", 
    "x3dbz": "model/x3d+binary", 
    "x3dv": "model/x3d+vrml", 
    "x3dvz": "model/x3d+vrml", 
    "x3dz": "model/x3d+xml", 
    "xaml": "application/xaml+xml", 
    "xap": "application/x-silverlight-app", 
    "xar": "application/vnd.xara", 
    "xbap": "application/x-ms-xbap", 
    "xbd": "application/vnd.fujixerox.docuworks.binder", 
    "xbm": "image/x-xbitmap", 
    "xdf": "application/xcap-diff+xml", 
    "xdm": "application/vnd.syncml.dm+xml", 
    "xdp": "application/vnd.adobe.xdp+xml", 
    "xdssc": "application/dssc+xml", 
    "xdw": "application/vnd.fujixerox.docuworks", 
    "xenc": "application/xenc+xml", 
    "xer": "application/patch-ops-error+xml", 
    "xfdf": "application/vnd.adobe.xfdf", 
    "xfdl": "application/vnd.xfdl", 
    "xht": "application/xhtml+xml", 
    "xhtml": "application/xhtml+xml", 
    "xhvml": "application/xv+xml", 
    "xif": "image/vnd.xiff", 
    "xla": "application/vnd.ms-excel", 
    "xlam": "application/vnd.ms-excel.addin.macroenabled.12", 
    "xlc": "application/vnd.ms-excel", 
    "xlf": "application/x-xliff+xml", 
    "xlm": "application/vnd.ms-excel", 
    "xls": "application/vnd.ms-excel", 
    "xlsb": "application/vnd.ms-excel.sheet.binary.macroenabled.12", 
    "xlsm": "application/vnd.ms-excel.sheet.macroenabled.12", 
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
    "xlt": "application/vnd.ms-excel", 
    "xltm": "application/vnd.ms-excel.template.macroenabled.12", 
    "xltx": "application/vnd.openxmlformats-officedocument.spreadsheetml.template", 
    "xlw": "application/vnd.ms-excel", 
    "xm": "audio/xm", 
    "xml": "application/xml", 
    "xo": "application/vnd.olpc-sugar", 
    "xop": "application/xop+xml", 
    "xpi": "application/x-xpinstall", 
    "xpl": "application/xproc+xml", 
    "xpm": "image/x-xpixmap", 
    "xpr": "application/vnd.is-xpr", 
    "xps": "application/vnd.ms-xpsdocument", 
    "xpw": "application/vnd.intercon.formnet", 
    "xpx": "application/vnd.intercon.formnet", 
    "xsl": "application/xml", 
    "xslt": "application/xslt+xml", 
    "xsm": "application/vnd.syncml+xml", 
    "xspf": "application/xspf+xml", 
    "xul": "application/vnd.mozilla.xul+xml", 
    "xvm": "application/xv+xml", 
    "xvml": "application/xv+xml", 
    "xwd": "image/x-xwindowdump", 
    "xyz": "chemical/x-xyz", 
    "xz": "application/x-xz", 
    "yang": "application/yang", 
    "yin": "application/yin+xml", 
    "z1": "application/x-zmachine", 
    "z2": "application/x-zmachine", 
    "z3": "application/x-zmachine", 
    "z4": "application/x-zmachine", 
    "z5": "application/x-zmachine", 
    "z6": "application/x-zmachine", 
    "z7": "application/x-zmachine", 
    "z8": "application/x-zmachine", 
    "zaz": "application/vnd.zzazz.deck+xml", 
    "zip": "application/zip", 
    "zir": "application/vnd.zul", 
    "zirz": "application/vnd.zul", 
    "zmm": "application/vnd.handheld-entertainment+xml"
};
var MIMECATEGORIES = {'video':[],'audio':[]}
for (var key in MIMETYPES) {
if (MIMETYPES[key].startsWith('video/')) {
    MIMECATEGORIES['video'].push( key )
} else if (MIMETYPES[key].startsWith('audio/')) {
    MIMECATEGORIES['audio'].push( key )
}
}
WSC.MIMECATEGORIES = MIMECATEGORIES
WSC.MIMETYPES = MIMETYPES

function getByPath(path, callback, FileSystem) {
    this.fs = FileSystem
    if (! (path.startsWith('/') || path.startsWith('\\'))) {
        var path = '/' + path
    }
    this.origpath = path.replaceAll('//', '/')
    this.fullPath = this.origpath
    var path = this.fs.mainPath + path
    this.path = path.replaceAll('//', '/')
    this.callback = callback
}

getByPath.prototype = {
    getFile: function() {
        fs.stat(this.path, function(error, stats) {
            if (error) {
                if (error.path && typeof error.path == 'string' && error.errno == -4048) {
                    var err = { }
                    err.path = error.path.replaceAll('\\', '/').replaceAll('//', '/')
                    if (error.path.endsWith('/')) {
                        var split = err.path.split('/')
                        err.name = split[split.length-1]
                    } else {
                        err.name = err.path.split('/').pop()
                    }
                    err.error = error
                }
                var err = err || {error: error}
                this.callback(err)
                return
            }
            this.size = stats.size
            this.modificationTime = stats.mtime
            this.isDirectory = stats.isDirectory()
            this.isFile = stats.isFile()
            this.callback(this)
        }.bind(this))
    },
    file: function(callback) {
        if (! this.isFile) {
            callback({error: 'Cannot preform on directory'})
            return
        }
        fs.readFile(this.path, 'utf8', function(err, data) {
            if (err) {
                callback({error:err})
                return
            }
            callback(data)
        }.bind(this))
    },
    getDirContents: function(callback) {
        if (this.isFile) {
            callback({error: 'Cannot preform on file'})
            return
        }
        fs.readdir(this.path, {encoding: 'utf-8'}, function(err, files) {
            if (err) {
                callback({error:err})
                return
            }
            var results = [ ]
            var i = 0
            var totalLength = files.length - 1
            function finished() {
                callback(results)
            }
            function getFileInfo() {
                var file = new WSC.FileSystemUtils.getByPath(this.origpath + '/' + files[i], function(file) {
                    results.push(file)
                    if (i != totalLength) {
                        i++
                        getFileInfo.bind(this)()
                    } else {
                        finished.bind(this)()
                    }
                }.bind(this), this.fs)
                file.name = files[i]
                file.getFile()
            }
            if (files.length > 0 && ! err) {
                getFileInfo.bind(this)()
            } else {
                finished.bind(this)()
            }
        }.bind(this))
    }
}

WSC.FileSystemUtils.getByPath = getByPath

function FileSystem(mainPath) {
    var mainPath = mainPath.replaceAll('\\', '/').replaceAll('\\', '/')
    if (mainPath.endsWith('/')) {
        var mainPath = mainPath.substring(0, mainPath.length - 1)
    }
    this.mainPath = mainPath
}
_.extend(FileSystem.prototype, {
    getByPath: function(path, callback) {
        var entry = new WSC.FileSystemUtils.getByPath(path, callback, this)
        entry.getFile()
    },
    writeFile: function(path, data, callback, allowOverWrite) {
        if (! (path.startsWith('/') || path.startsWith('\\'))) {
            var path = '/' + path
        }
        var origpath = path
        var path = this.mainPath + path
        var folder = WSC.utils.stripOffFile(path)
        if (! fs.existsSync(folder)) {
            try {
                console.log(folder)
                fs.mkdirSync(folder)
            } catch(e) { }
        }
        fs.writeFile(path, data, (err) => {
            if (err) {
                callback({error: err, success: false})
            } else {
                callback({error: false, success: true})
            }
        })
    },
    deleteFile: function(path, callback) {
        if (! (path.startsWith('/') || path.startsWith('\\'))) {
            var path = '/' + path
        }
        var origpath = path
        var path = this.mainPath + path
        fs.stat(path, function(error, stats) {
            if (error) {
                callback({error: 'File Not Found'})
                return
            } else if (stats.isDirectory()) {
                fs.rmdir(path, { recursive: true }, (err) => {
                    if (err) {
                        callback({error: err, success: false})
                    } else {
                        callback({error: false, success: true})
                    }
                })
            } else {
                fs.unlink(path, (err) => {
                    if (err) {
                        callback({error: err, success: false})
                    } else {
                        callback({error: false, success: true})
                    }
                })
            }
        })
    },
    createWriteStream: function(path) {
        if (! (path.startsWith('/') || path.startsWith('\\'))) {
            var path = '/' + path
        }
        this.origpath = path
        var path = this.mainPath + path
        var path = path.replaceAll('//', '/')
        var folder = WSC.utils.stripOffFile(path)
        if (! fs.existsSync(folder)) {
            try {
                fs.mkdirSync(folder)
            } catch(e) {
                return {error: 'error creating folder'}
            }
        }
        return fs.createWriteStream(path)
    }
})
WSC.FileSystem = FileSystem

function DirectoryEntryHandler(FileSystem, request, app, req, res) {
    WSC.BaseHandler.prototype.constructor.call(this)
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
_.extend(DirectoryEntryHandler.prototype, {
    head: function() {
        this.get()
    },
    tryHandle: function() {
        console.log(this.request.ip + ':', 'Request',this.request.method, this.request.uri)
        function finished() {
            if (this.request.path == this.app.opts.optIpBlockList) {
                this.error('<h1>403 - Forbidden</h1>', 403)
                return
            }
            
            var filename = this.request.path.split('/').pop()
            if (filename == 'wsc.htaccess') {
                if ((this.request.method == 'GET' && ! this.app.opts.optGETHtaccess) ||
                    (this.request.method == 'HEAD' && ! this.app.opts.optGETHtaccess) ||
                    (this.request.method == 'PUT' && ! this.app.opts.optPUTPOSTHtaccess) ||
                    (this.request.method == 'POST' && ! this.app.opts.optPUTPOSTHtaccess) ||
                    (this.request.method == 'DELETE' && ! this.app.opts.optDELETEHtaccess)) {
                    this.error('<h1>400 - Bad Request</h1>', 400)
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
                    this.error("<h1>401 - Unauthorized</h1>", 401)
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
                    file.file(function(data) {
                        try {
                            var ipBlockList = JSON.parse(data)
                        } catch(e) {
                            console.log('Failed to parse Ip block list')
                        }
                        if (ipBlockList.includes(this.request.ip)) {
                            this.error('<h1>403 - Forbidden</h1>', 403)
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
                    file.file(function(dataa) {
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
                                this.htaccessError.bind(this)('missing type')
                                return
                            }
                            if (! origdata[i].request_path && origdata[i].type != 'directory listing') {
                                this.htaccessError.bind(this)('missing request path')
                                return
                            }
                            if (origdata[i].type == 403 && origdata[i].request_path == filerequested) {
                                this.error('<h1>403 - Forbidden</h1>', 403)
                                return
                            }
                            if ((origdata[i].request_path == filerequested && origdata[i].type == 'POSTkey') ||
                                (origdata[i].request_path == filerequested && origdata[i].type == 'serverSideJavaScript')) {
                                this.error('bad request', 403)
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
                                this.htaccessError.bind(this)('missing Auth Username')
                                return
                            }
                            if (! authdata.password) {
                                this.htaccessError.bind(this)('missing Auth Password')
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
                                this.error("<h1>401 - Unauthorized</h1>", 401)
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
            this.fs.deleteFile(this.request.path, function(e) {
                if (e.error) {
                    this.write('Error deleting file')
                    this.finish()
                } else {
                    this.writeHeaders(200)
                    this.finish()
                }
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
                file.file(function(data) {
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
                            this.htaccessError.bind(this)('missing type')
                            return
                        }
                        if (! origdata[i].request_path && origdata[i].type != 'directory listing') {
                            this.htaccessError.bind(this)('missing request path')
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
                            this.error('<h1>403 - Forbidden</h1>', 403)
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
                            this.htaccessError.bind(this)('missing Auth Username')
                            return
                        }
                        if (! authdata.password) {
                            this.htaccessError.bind(this)('missing Auth Password')
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
                            this.error("<h1>401 - Unauthorized</h1>", 401)
                            return
                        }
                    }
                    if (filefound) {
                        if (! data.key) {
                            this.htaccessError.bind(this)('missing key')
                            return
                        }
                        this.fs.getByPath(WSC.utils.stripOffFile(this.request.origpath) + data.original_request_path, function(file) {
                            if (file && ! file.error && file.isFile) {
                                file.file(function(dataa) {
                                    var contents = dataa.split('\n')
                                    var validFile = false
                                    for (var i=0; i<contents.length; i++) {
                                        contents[i] = contents[i].replaceAll('\t', '').replaceAll('\n', '').replaceAll('\r', '')
                                        if (contents[i].startsWith('postKey')) {
                                            var postKey = contents[i].split('=').pop().replaceAll(' ', '').replaceAll('"', '').replaceAll('\'', '')
                                            if (postKey == data.key) {
                                                var validFile = true
                                                break
                                            }
                                        }
                                    }
                                    if (validFile) {
                                        var req = this.request
                                        var res = this
                                        var tempData = { }
                                        var httpRequest = WSC.httpRequest
                                        try {
                                            eval('(function() {var handler = function(req, res, tempData, httpRequest, appInfo) {' + dataa + '};handler(req, res, tempData, httpRequest, {"server": "Simple Web Server"})})();')
                                        } catch(e) {
                                            console.error(e)
                                            this.write('Error with your script', 500)
                                            this.finish()
                                        }
                                    } else {
                                        this.write('The keys do not match or were not found', 403)
                                    }
                                }.bind(this))
                            } else if (file.isDirectory) {
                                this.error('SSJS cannot be performed on a directory', 500)
                            } else {
                                this.error('<h1>404 - File not found</h1>', 404)
                            }
                        }.bind(this))
                    } else {
                        this.error('404 - file not found', 404)
                    }
                }.bind(this))
            } else {
                this.error('404 - file not found', 404)
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
                    this.fs.deleteFile(this.request.path, function(e) {
                        if (e.error) {
                            this.write('Error writing file', 500)
                            this.finish()
                        } else {
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
                        }
                    }.bind(this))
                } else {
                    this.write('file already exists', 400)
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
                    this.error('403 - Unauthorized', 403)
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
                        this.error("404 - File not found", 404)
                    } else if (this.request.arguments && this.request.arguments.json == '1' ||
                        (this.request.headers['accept'] && this.request.headers['accept'].toLowerCase() == 'application/json')
                       ) {
                        this.renderDirectoryListingJSON(results)
                    } else if (this.request.arguments && this.request.arguments.static == '1' ||
                        this.request.arguments.static == 'true' ||
                        this.app.opts.optStatic
                       ) {
                        this.renderDirectoryListing(results)
                    } else if (this.request.arguments.staticjs == '1' || this.request.arguments.staticjs == 'true' || this.app.opts.optStaticjs) {
                        this.renderDirectoryListingStaticJs(results)
                    } else {
                        this.renderDirectoryListingTemplate(results)
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
                    file.file(function(dataa) {
                        try {
                            var origdata = JSON.parse(dataa)
                        } catch(e) {
                            this.write('<p>wsc.htaccess file found, but it is not a valid json array. Please read the htaccess readme <a href="https://github.com/ethanaobrien/web-server-chrome/blob/master/htaccess/README.md">here</a></p>\n\n\n'+e, 500)
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
                                    this.htaccessError.bind(this)('missing type')
                                    return
                                }
                                if (! origdata[i].request_path && origdata[i].type != 'directory listing') {
                                    this.htaccessError.bind(this)('missing request path')
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
                                this.error('bad request', 403)
                                return
                            }
                            function htaccessCheck2() {
                                if (filefound) {
                                    if (data.type == 301 || data.type == 302 || data.type == 307) {
                                        if (! data.redirto) {
                                            this.htaccessError.bind(this)('missing redirect location')
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
                                            this.error('<h1>403 - Forbidden</h1>', 403)
                                        } else {
                                            excludedothtmlcheck.bind(this)()
                                        }
                                    } else if (data.type == 403) {
                                        this.error('<h1>403 - Forbidden</h1>', 403)
                                    } else if (data.type == 'directory listing') {
                                        function finished(results) {
                                            if (this.request.arguments.json == '1' ||
                                                this.request.headers['accept'].toLowerCase() == 'application/json') {
                                                this.renderDirectoryListingJSON(results)
                                            } else if (this.request.arguments.static == '1' ||
                                                       this.request.arguments.static == 'true' ||
                                                       this.app.opts.optStatic) {
                                                this.renderDirectoryListing(results)
                                            } else if (this.request.arguments.staticjs == '1' || this.request.arguments.staticjs == 'true' || this.app.opts.optStaticjs) {
                                                this.renderDirectoryListingStaticJs(results)
                                            } else {
                                                this.renderDirectoryListingTemplate(results)
                                            }
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
                                                    file.file(function(dataa) {
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
                                                this.htaccessError.bind(this)('invalid path to send dir contents')
                                            }
                                        }.bind(this))
                                    } else if (data.type == 'versioning') {
                                        //console.log('versioning')
                                        if (! data.version_data || data.version_data.length == 0) {
                                            this.htaccessError.bind(this)('missing version data')
                                            return
                                        }
                                        if (! data.variable) {
                                            this.htaccessError.bind(this)('missing variable')
                                            return
                                        }
                                        if (! data.default) {
                                            this.htaccessError.bind(this)('missing default file selection')
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
                                            this.htaccessError.bind(this)('missing key')
                                            return
                                        }
                                        this.fs.getByPath(WSC.utils.stripOffFile(this.request.origpath) + data.original_request_path, function(file) {
                                            if (file && ! file.error && file.isFile) {
                                                file.file(function(dataa) {
                                                    var contents = dataa.split('\n')
                                                    var validFile = false
                                                    for (var i=0; i<contents.length; i++) {
                                                        contents[i] = contents[i].replaceAll('\t', '').replaceAll('\n', '').replaceAll('\r', '')
                                                        if (contents[i].startsWith('SSJSKey')) {
                                                            var SSJSKey = contents[i].split('=').pop().replaceAll(' ', '').replaceAll('"', '').replaceAll('\'', '')
                                                            if (SSJSKey == data.key) {
                                                                var validFile = true
                                                                break
                                                            }
                                                        }
                                                    }
                                                    if (validFile) {
                                                        var req = this.request
                                                        var res = this
                                                        var httpRequest = WSC.httpRequest
                                                        var tempData = { }
                                                        try {
                                                            eval('(function() {var handler = function(req, res, tempData, httpRequest, appInfo) {' + dataa + '};handler(req, res, tempData, httpRequest, {"server": "Simple Web Server"})})();')
                                                        } catch(e) {
                                                            console.error(e)
                                                            this.write('Error with your script', 500)
                                                            this.finish()
                                                        }
                                                    } else {
                                                        this.write('The keys do not match or were not found', 403)
                                                    }
                                                }.bind(this))
                                            } else if (file.isDirectory) {
                                                this.error('SSJS cannot be performed on a directory', 500)
                                            } else {
                                                this.error('<h1>404 - File not found</h1>', 404)
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
                                     this.htaccessError.bind(this)('missing Auth Username')
                                     return
                                 }
                                 if (! authdata.password) {
                                     this.htaccessError.bind(this)('missing Auth Password')
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
                                        this.error("<h1>401 - Unauthorized</h1>", 401)
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
            this.error('404 - File not found', 404)
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
    renderDirectoryListingJSON: function(results) {
        this.setHeader('content-type','application/json; charset=utf-8')
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
            var name = _.escape(results[i].name)
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
            var name = _.escape(results[i].name)
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
        html.push('</ul></html>')
        this.setHeader('content-type','text/html; charset=utf-8')
        this.write(html.join('\n'))
    },
    getDirContents: function(entry, callback) {
        entry.getDirContents(function(files) {
            callback(files)
        })
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
    writeFile: function(path, data, allowReplaceFile, callback) {
        if (! path.startsWith('/')) {
            var path = WSC.utils.relativePath(path, WSC.utils.stripOffFile(this.request.origpath))
        }
        if (! callback) {
            var callback = function(file) { }
        }
        var parts = path.split('/')
        var folderPath = parts.slice(0,parts.length-1).join('/')
        var filename = parts[parts.length-1]
        this.fs.getByPath(path, function(entry) {
            if (entry.error) {
                this.fs.writeFile(path, data, callback)
            } else if (allowReplaceFile) {
                this.fs.deleteFile(path, function(e) {
                    if (e.error) {
                        callback(e)
                    } else {
                        this.fs.writeFile(path, data, callback)
                    }
                }.bind(this))
            } else {
                callback({error: 'File Already Exists'})
            }
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
                callback({error: 'File not found'})
            }
        })
    },
    writeCode: function(code) {
        if (! code) {
            code = 200
        }
        this.responseLength = 0
        this.writeHeaders(code)
    },
    contentType: function(type) {
        this.setHeader('content-type', type)
    },
    end: function() {
        this.finish()
    }
}, WSC.BaseHandler.prototype)

WSC.DirectoryEntryHandler = DirectoryEntryHandler


WSC.utils = {
    humanFileSize: function(bytes, si=false, dp=1) {
            //from https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
            const thresh = si ? 1000 : 1024;
            if (Math.abs(bytes) < thresh) {
              return bytes + ' B';
            }
            const units = si 
              ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
              : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
            let u = -1;
            const r = 10**dp;
            do {
              bytes /= thresh;
              ++u;
            } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
            return bytes.toFixed(dp) + ' ' + units[u];
    },
    lastModified: function(modificationTime) {
        if (! modificationTime) {
            return
        }
        var lastModifiedMonth = modificationTime.getMonth() + 1
        var lastModifiedDay = modificationTime.getDate()
        var lastModifiedYear = modificationTime.getFullYear().toString().substring(2, 4)
        var lastModifiedHours = modificationTime.getHours()
        var lastModifiedMinutes = modificationTime.getMinutes()
        var lastModifiedSeconds = modificationTime.getSeconds()
        var lastModified = lastModifiedMonth+
                           lastModifiedDay+
                           lastModifiedYear+
                           lastModifiedHours+
                           lastModifiedMinutes+
                           lastModifiedSeconds
        return lastModified
    },
    lastModifiedStr: function(modificationTime) {
        if (! modificationTime) {
            return
        }
        var lastModifiedMonth = modificationTime.getMonth() + 1
        var lastModifiedDay = modificationTime.getDate()
        var lastModifiedYear = modificationTime.getFullYear().toString().substring(2, 4)
        var lastModifiedHours = modificationTime.getHours()
        var lastModifiedMinutes = modificationTime.getMinutes()
        var lastModifiedSeconds = modificationTime.getSeconds()
        if (lastModifiedSeconds.toString().length != 2) {
            var lastModifiedSeconds = '0' + lastModifiedSeconds
        }
        if (lastModifiedMinutes.toString().length != 2) {
            var lastModifiedMinutes = '0' + lastModifiedMinutes
        }
        if (lastModifiedDay.toString().length != 2) {
            var lastModifiedDay = '0' + lastModifiedDay
        }
        if (lastModifiedHours >= 12) {
            var lastModifiedAmPm = 'PM'
            if (lastModifiedHours > 12) {
                var lastModifiedHours = lastModifiedHours - 12
            }
        } else {
            var lastModifiedAmPm = 'AM'
        }
        var lastModifiedStr = lastModifiedMonth+'/'+
                              lastModifiedDay+'/'+
                              lastModifiedYear+', '+
                              lastModifiedHours+':'+
                              lastModifiedMinutes+':'+
                              lastModifiedSeconds +' '+
                              lastModifiedAmPm
        return lastModifiedStr
    },
    htaccessFileRequested: function(filerequested, index) {
        if (index) {
            if (filerequested == 'index.html' ||
                filerequested == 'index.htm' ||
                filerequested == 'index' ||
                filerequested == 'index.xhtm' ||
                filerequested == 'index.xhtml' ||
                filerequested == '') {
                return 'index'
            } else {
                return filerequested
            }
        } else {
            if (filerequested == 'index.html' ||
                filerequested == 'index.htm' ||
                filerequested == 'index' ||
                filerequested == 'index.xhtm' ||
                filerequested == 'index.xhtml') {
                return 'index'
            } else {
                return filerequested
            }
        }
    },
    relativePath: function(reqPath, curPath) {
        var split1 = curPath.split('/')
        var split2 = reqPath.split('/')
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
        var newPath = split1.join('/')
        if (! newPath.startsWith('/')) {
            var newPath = '/' + newPath
        }
        return newPath
    },
    stripOffFile: function(origpath) {
        var fullrequestpath = origpath
        var finpath = fullrequestpath.split('/').pop()
        var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length)
        if (origpath == '/') {
            return '/'
        } else {
            return finalpath
        }
        
    }
}

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
            console.error('url must start with http')
            throw new Error('url must start with http or https')
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
            this.responseData = data
            if (typeof data == 'string') {
                var data = Buffer.from(data)
            }
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
        if ((res.statusCode == 301 || res.statusCode == 302 || res.statusCode == 307) && this.reDirectLimit > this.reDirectCount) {
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
            var path = this.handler.fs.mainPath + this.savePath
            var folder = WSC.utils.stripOffFile(path)
            if (! fs.existsSync(folder)) {
                try {
                    fs.mkdirSync(folder)
                } catch(e) { }
            }
            var writeStream = fs.createWriteStream(path)
            writeStream.on('error', function (err) {
                var evt = {error: 'There was an error while writing the file'}
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
WSC.httpRequest = httpRequest

function testHttpRequest() {
    var http = new WSC.httpRequest()
    http.onload = function(e) {
        console.log(e)
    }
    http.open('GET', 'http://www.google.com')
    http.send()
    
}

String.prototype.htmlEscape = function() {
    return String(this).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}


var main_fs = new WSC.FileSystem(__dirname)
main_fs.getByPath('/directory-listing-template.html', function(file) {
    file.file(function(data) {
        WSC.template_data = data
    })
})
main_fs.getByPath('/directory-listing-template-static.html', function(file) {
    file.file(function(data) {
        WSC.static_template_data = data
    })
})
module.exports = WSC;


