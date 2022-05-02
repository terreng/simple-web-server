global.torrentStream = require('torrent-stream');
global.JSZip = require("jszip");
global.MIMETYPES = WSC.MIMETYPES;
global.fetch = require("./WSC/proxy/fetch.js");
global.torrent = require("./WSC/proxy/torrent.js");
global.parseTextFile = require("./WSC/proxy/parseText.js");
global.changeHtml = require("./WSC/proxy/changeHtml.js");
global.hideTitle = require("./WSC/proxy/hideTitle.js");
WSC.proxy.setupWebsocket = require("./WSC/proxy/websocket.js");
global.urlShortener = require("./WSC/proxy/urlShortener.js");
var a = require("./WSC/proxy/utils.js");
for (var k in a) {
    global[k] = a[k];
}
global.debug = false;
global.forceSite = '';

global.sites = [ //no '/' at end
    //site, isBuggy, display_name
    ['https://simplewebserver.org/', false, 'Simple Web Server']
]

module.exports = async function(req, res, serverconfig) {
    const allowAdultContent = serverconfig.adultContent || false;
    const allowTorrenting = serverconfig.torrent || true;
    var host = req.headers.host;
    var url=req.url,method=req.method;
    if (req.url.split('?')[0] === '/torrentStream') {
        torrent(req, res, allowTorrenting);
        return;
    }
    if (req.url.split('?')[0].toLowerCase().startsWith('/tinyurl')) {
        urlShortener(req, res);
        return;
    }
    if (req.url.split('?')[0] === '/changeSiteToServe') {
        changeHtml(req, res, allowAdultContent);
        return;
    }
    var opts = getOpts(req.headers.cookie);
    if (! opts.site2Proxy && req.url.split('?')[0] && !req.url.startsWith('/http')) {
        res.setHeader('location', '/changeSiteToServe');
        res.setHeader('content-length', 0);
        res.writeHead(307);
        res.end();
        return;
    }
    if (req.url.startsWith('/http') && (req.url.substring(1).startsWith('https://'+req.headers.host) || req.url.substring(1).startsWith('https:/'+req.headers.host) || req.url.substring(1).startsWith('http://'+req.headers.host) || req.url.substring(1).startsWith('http:/'+req.headers.host))) {
        res.setHeader('location', req.url.split('/'+req.headers.host).pop().replaceAll('//', '/'));
        res.setHeader('content-length', 0);
        res.writeHead(301);
        res.end();
        return;
    }
    var a = processUrl(url, host, opts);
    url = a.url;
    args = a.args;
    if (!opts.site2Proxy) {
        opts.site2Proxy = new URL('/', url);
        opts.site2Proxy = opts.site2Proxy.toString();
        if (opts.site2Proxy.endsWith('/')) {
            opts.site2Proxy = opts.site2Proxy.substring(0, opts.site2Proxy.length-1);
        }
    }
    try {
        var isNotGood = isNotGoodSite((new URL(url)).hostname);
        if (isNotGood && !allowAdultContent) {
            var body = bodyBuffer('<p>site blocked. Contact the site owner for more information</p>');
            res.setHeader('content-type', 'text/html; chartset=utf-8');
            res.setHeader('content-length', body.byteLength);
            res.writeHead(200);
            res.end(body);
            return;
        } else if (isNotGood && !opts.allowAdultContent) {
            var body = bodyBuffer('<p>this site requires configuring to visit. </p><a href="/changeSiteToServe">Go here to change your settings</a>');
            res.setHeader('content-type', 'text/html; chartset=utf-8');
            res.setHeader('content-length', body.byteLength);
            res.writeHead(200);
            res.end(body);
            return;
        }
    }catch(e){};
    if (req.url.split('?')[0] === '/hideTitle') {
        hideTitle(req, res, opts);
        return
    }
    if (opts.useHiddenPage && req.headers['sec-fetch-dest'] === 'document') {
        res.setHeader('location', '/hideTitle?'+encodeURIComponent(btoa(encodeURIComponent('url='+req.url))));
        res.setHeader('content-length', 0);
        res.writeHead(307);
        res.end();
        return;
    }
    if (!opts.proxyJSReplace) {
        opts.proxyJSReplace = true;
    }
    var vc = args.vc, nc = args.nc;
    var reqBody = await consumeBody(req);
    if (req.headers['content-type'] && req.headers['content-type'].includes('x-www-form-urlencoded')) {
        reqBody = Buffer.from(parseTextFile(reqBody.toString(), 'x-www-form-urlencoded', opts, url, host, false));
    }
    try {
        var resp = await fetch(method, url, req.headers, reqBody, opts, host);
    } catch(e) {
        if (debug) {
            console.log(e)
        }
        res.writeHead(404);
        res.end('error');
        return;
    }
    if (['1', 'true'].includes(args.video) && resp.isString && resp.body.includes('setVideoUrlHigh(\'')) {
        res.setHeader('location', '/'+resp.body.split('setVideoUrlHigh(\'').pop().split("'")[0]);
        res.setHeader('content-length', 0);
        res.writeHead(307);
        res.end();
        return;
    }
    for (var k in resp.headers) {
        if (['content-security-policy', 'content-encoding'].includes(k) || (k === 'content-length' && resp.isString)) {
            continue;
        }
        if (k === 'set-cookie') {
            var {hostname} = new URL(url);
            if (Array.isArray(resp.headers[k])) {
                var cookies = [];
                for (var i=0; i<resp.headers[k].length; i++) {
                    cookies.push(parseSetCookie(resp.headers[k][i], hostname, opts.isAbsoluteProxy));
                }
                res.setHeader(k, cookies);
            } else {
                res.setHeader(k, parseSetCookie(resp.headers[k], hostname, opts.isAbsoluteProxy));
            }
            continue;
        }
        if (resp.headers[k].startsWith('//')) {
            resp.headers[k] = 'https:'+resp.headers[k];
        }
        if (resp.headers[k].startsWith('/')) {
            try {
                resp.headers[k] = 'https://'+(new URL(url)).hostname+resp.headers[k];
            } catch(e) {};
        }
        if (typeof resp.headers[k] == 'string') {
            res.setHeader(k, resp.headers[k].replaceAll(opts.site2Proxy+'/', '/').replaceAll(opts.site2Proxy, '').replaceAll('http', '/http'));
        } else {
            res.setHeader(k, resp.headers[k]);
        }
    }
    res.setHeader('x-frame-options', 'SAMEORIGIN');
    if (vc == 'true' || vc == '1' || nc == 'true' || nc == '1') {
        res.setHeader('content-type', 'text/plain');
    }
    if (resp.isString) {
        //javascript/html parsing
        var body = '';
        if (!nc || (nc != '1' && nc != 'true')) {
            body = parseTextFile(resp.body, resp.contentType, opts, url, host, opts.proxyJSReplace);
        } else {
            body = resp.body;
        }
        body = bodyBuffer(body);
        res.setHeader('content-length', body.byteLength);
        res.writeHead(resp.code || 200);
        res.end(body);
    } else {
        res.writeHead(resp.code || 200);
        resp.res.pipe(res);
    }
}

