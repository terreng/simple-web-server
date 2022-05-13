global.urlCache = {};

module.exports = async function(req, res) {
    for (var k in global.urlCache) {
        if ((new Date())-global.urlCache[k].date > 600000) {
            delete global.urlCache[k];
        }
    }
    var args,body;
    if (req.method.toLowerCase() === 'post') {
        body = await consumeBody(req);
        body = body.toString();
        args = transformArgs('?'+body);
    } else {
        args = transformArgs(req.url);
    }
    var errMsg = '';
    if (args.url && args.phrase) {
        try {
            new URL(args.url);
        } catch(e) {
            errMsg = 'invalid url. Does it start with http:// or https://?';
        }
        if (global.urlCache[args.phrase]) {
            errMsg = 'phrase already chosen. Please choose another';
        }
    }
    if (req.url.toLowerCase() === '/tinyurl' && (errMsg && errMsg.trim() || (!args.url && !args.phrase))) {
        res.setHeader('content-type', 'text/html; chartset=utf-8');
        var html = '<html><head><title>Url Shortener</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><ul><br><h1>Url Shortener</h1><ul>';
        if (errMsg && errMsg.trim()) {
            html += '<p style="color:red;">Error: '+errMsg+'</p>';
        }
        html += '<form action="" method="POST" autocomplete="off"><br><label for="url">Custom URL: </label><input type="text" id="url" name="url"><br><br><label for="phrase">Phrase: </label><input type="text" id="phrase" name="phrase"><br><br><input type="submit" value="Submit"></form><ul></ul></body></html>';
        html = bodyBuffer(html);
        res.setHeader('content-length', html.byteLength);
        res.end(html);
    } else if (args.url && args.phrase) {
        res.setHeader('content-type', 'text/html; chartset=utf-8');
        global.urlCache[args.phrase] = args.url;
        var html = '<html><head><title>Url Shortener</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><ul><br><h1>Url Shortened</h1><ul><h2><a href="/tinyurl/'+args.phrase+'">'+req.headers.host+'/tinyurl/'+args.phrase+'</a></h2><p>Share <a href="/tinyurl/'+args.phrase+'">this link</a>. valid for 10 minutes</ul></ul></body></html>';
        html = bodyBuffer(html);
        res.setHeader('content-length', html.byteLength);
        res.end(html);
    } else if (req.url.split('?')[0].substring(9, req.url.split('?')[0].length).split('/')[0] && global.urlCache[req.url.split('?')[0].substring(9, req.url.split('?')[0].length).split('/')[0]]) {
        res.setHeader('location', global.urlCache[req.url.split('?')[0].substring(9, req.url.split('?')[0].length).split('/')[0]]);
        res.setHeader('content-length', 0);
        res.writeHead(303);
        res.end();
    } else {
        var html = 'Url invalid';
        html = bodyBuffer(html);
        res.setHeader('content-length', html.byteLength);
        res.end(html);
    }
}
