module.exports = async function(req, res, allowAdultContent) {
    var errMsg = '', adultContent = false;
    if (typeof forceSite !== undefined &&
        typeof forceSite == 'string' &&
        forceSite.trim() !== '') {
        var site = forceSite;
        try {
            var b;
            while (b = await check4Redirects(site)) {
                site = b;
            }
            var newURL = new URL('/', site);
            newURL = newURL.toString();
            if (newURL.endsWith('/')) {
                newURL = newURL.substring(0, newURL.length-1);
            }
            site = newURL;
        } catch(e) {
            res.end('Message for site owner: Invalid absolute url');
            return;
        }
        res.setHeader('set-cookie', 'proxySettings='+encodeURIComponent(site)+'_1_1_0_0_0; Max-Age=2592000; HttpOnly');
        res.setHeader('location', path2Redir2 || '/');
        res.setHeader('content-length', 0);
        res.writeHead(303);
        res.end();
        return;
    }
    var args,body;
    if (req.url.includes('?') || req.method.toLowerCase() === 'post') {
        if (req.method.toLowerCase() === 'post') {
            body = await consumeBody(req);
            body = body.toString();
            args = transformArgs('?'+body);
        } else {
            args = transformArgs(req.url);
        }
        if (args.site && args.site.startsWith('/http')) {
            args.site = args.site.substring(1);
        }
        if (args.custom && args.custom.startsWith('/http')) {
            args.custom = args.custom.substring(1);
        }
        if ((args.site || args.custom)) {
            var error = false;
            var path2Redir2 = '/';
            var opts = {};
            if (req.headers.cookie) {
                opts = getOpts(req.headers.cookie);
            }
            if (opts.site2Proxy && opts.site2Proxy === args.custom && args.site) {
                delete args.custom;
            }
            if (args.custom) {
                try {
                    try {
                        new URL(args.custom);
                    } catch(e) {
                        if (!args.custom.startsWith('http')) {
                            args.custom = 'http://'+args.custom;
                        }
                    }
                    var isNotGood = isNotGoodSite(args.custom?args.custom:decodeURIComponent(args.site));
                    if (((!args.confirmation && allowAdultContent) && isNotGood) || (!allowAdultContent && isNotGood)) {
                        error = true;
                        adultContent = true;
                    }
                    if (!error) {
                        var b;/*
                        while (b = await check4Redirects(args.custom)) {
                            args.custom = b;
                        }*/
                        var a = new URL(args.custom);
                        if (a.hostname.includes('127.0') || a.hostname.includes('192.168')) {
                            throw new Error('Cannot use local url');
                        }
                        path2Redir2 = a.pathname+a.search;
                        var newURL = new URL('/', args.custom);
                        newURL = newURL.toString();
                        if (newURL.endsWith('/')) {
                            newURL = newURL.substring(0, newURL.length-1);
                        }
                        args.custom = newURL;
                    }
                } catch(e) {
                    console.log(e);
                    error = true;
                    errMsg = 'invalid URL';
                }
            }
            var isNotGood = isNotGoodSite(args.custom?args.custom:decodeURIComponent(args.site));
            if (((!args.confirmation && allowAdultContent) && isNotGood) || (!allowAdultContent && isNotGood)) {
                error = true;
                adultContent = true;
            }
            if (!error) {
                res.setHeader('set-cookie', 'proxySettings='+(args.custom?encodeURIComponent(args.custom):args.site)+'_'+(args.JSReplaceURL?'1':'0')+'_'+(args.absoluteSite?'1':'0')+'_'+(args.hidden?'1':'0')+'_'+(args.replaceExternal?'1':'0')+'_'+(args.confirmation?'1':'0')+'; '+(clearOnExit?'Max-Age=2592000;':'')+' HttpOnly');
                if (args.shareURL) {
                    var {hostname} = new URL(args.custom?args.custom:decodeURIComponent(args.site));
                    res.setHeader('content-type', 'text/html; chartset=utf-8');
                    var url = body?body:req.url.split('?').pop();
                    url=url.replace('shareURL=true', '').replaceAll('&&', '&');
                    if (url.endsWith('&')) {
                        url = url.substring(0, url.length-1);
                    }
                    var html = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Share URL</title></head><body><br><center><p>drag the link below to your bookmark bar</p><p>Or right click and press copy link to share</p><p>or just click it to continue</p><a href="/changeSiteToServe?'+url+'">'+hostname+'</a></center></body></html>';
                    html = bodyBuffer(html);
                    res.setHeader('content-length', html.byteLength);
                    res.writeHead(200);
                    res.end(html);
                } else {
                    res.setHeader('location', path2Redir2 || '/');
                    res.setHeader('content-length', 0);
                    res.writeHead(303);
                    res.end();
                }
                return;
            }
        } else {
            errMsg = 'URL not chosen';
        }
    }
    res.setHeader('content-type', 'text/html; chartset=utf-8');
    var html = '';
    html += '<html><head><title>Change Site to Serve</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><ul><br><h1>Change Site to Serve</h1><ul>';
    if (errMsg && errMsg.trim()) {
        html += '<p style="color:red;">Error: '+errMsg+'</p>';
    } else {
        html += '<p>It is recommended to bookmark this page to be able to easily change the site in the future</p>';
    }
    if (adultContent && allowAdultContent) {
        html += '<p style="color:red;">Warning: site may include adult content. Please confirm your settings</p>';
    } else if (adultContent) {
        html += '<p style="color:red;">Site restricted. Please contact the site owner for more information</p>';
    }
    var customVal='',
        rpSlashUrls=' checked',
        absoluteSite='',
        gc='',
        external='',
        share='',
        clearOnExit='';
    if (req.headers.cookie) {
        var opts = getOpts(req.headers.cookie);
        customVal = opts.site2Proxy || '';
        rpSlashUrls = opts.proxyJSReplace?' checked':'';
        absoluteSite = opts.isAbsoluteProxy?' checked':'';
        gc = opts.useHiddenPage?' checked':'';
        external = opts.replaceExternalUrls?' checked':'';
    }
    if (args) {
        customVal = args.custom || '';
        rpSlashUrls = args.JSReplaceURL?' checked':'';
        absoluteSite = args.absoluteSite?' checked':'';
        gc = args.hidden?' checked':'';
        external = args.replaceExternal?' checked':'';
        share = args.shareURL?' checked':'';
        clearOnExit = args.clearOnExit?' checked':''
    }
    html += '<form action="" method="POST" autocomplete="off">';
    for (var i=0; i<sites.length; i++) {
        var c = '';
        if (sites[i][0] === customVal) {
            c = ' checked';
            customVal = '';
        }
        html += '<input type="radio" id="'+encodeURIComponent(sites[i][0])+'" name="site" value="'+encodeURIComponent(sites[i][0])+'"'+c+'><label for="'+encodeURIComponent(sites[i][0])+'">'+sites[i][2]+(sites[i][1]?' (buggy)':'')+'</label><br>';
    }
    html += ('<br><label for="custom">Custom URL</label><input type="text" id="custom" name="custom" value='+customVal+'><br><br><input type="checkbox" id="JSReplaceURL" name="JSReplaceURL" value="true"'+rpSlashUrls+'><label for="JSReplaceURL"> Replace Javascript // urls (may break some sites)</label><br><br><input type="checkbox" id="absoluteSite" name="absoluteSite" value="true"'+absoluteSite+'><label for="absoluteSite"> Set as absolute proxy site (required for some sites, recommended to clear your cookies before enabling to prevent possible leak of personal data)</label><br><br><input type="checkbox" id="hidden" name="hidden" value="true"'+gc+'><label for="hidden"> Hide page title/url from search history (will appear as google classroom)</label><br><br><input type="checkbox" id="replaceExternal" name="replaceExternal" value="true"'+external+'><label for="replaceExternal"> Replace External URLs</label><br><br><input type="checkbox" id="shareURL" name="shareURL" value="true"'+share+'><label for="shareURL"> Get url to share (or bookmark)</label><br><br><input type="checkbox" id="clearOnExit" name="clearOnExit" value="true"'+clearOnExit+'><label for="clearOnExit"> Clear site to serve on Browser exit</label><br><br>');
    if (adultContent && allowAdultContent) {
        html += '<input type="checkbox" id="confirmation" name="confirmation" value="true"><label for="confirmation"> Check this box to confirm you know what you are about to see may be adult content.</label><br><br>';
    }
    html +='<input type="submit" value="Submit"></form><ul></ul>';
    html += '</body></html>';
    html = bodyBuffer(html);
    res.setHeader('content-length', html.byteLength);
    res.end(html);
}
