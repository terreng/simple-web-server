module.exports = function(req, res, opts) {
    var url = '/';
    if (req.url.includes('?')) {
        if (req.url.split('?').pop().includes('url=')) {
            res.setHeader('location', '/hideTitle?'+encodeURIComponent(btoa(encodeURIComponent(transformArgs(req.url).url))));
            res.setHeader('content-length', 0);
            res.writeHead(307);
            res.end();
            return;
        } else {
            try {
                url = transformArgs('?'+decodeURIComponent(atob(decodeURIComponent(req.url.split('?').pop())))).url || '/';
            } catch(e) {
                url = '/';
            }
        }
    }
    var html = '<html><head><link rel="icon" type="image/png" href="/https:/ssl.gstatic.com/classroom/favicon.png"><title>Classes</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>*{padding:0;margin:0;}iframe{margin:0 auto;}</style></head><body><noscript><p>Some features may not work without javascript</p></noscript><button onclick="goBack()">Back</button> <button onclick="goForward()">Forward</button> <button onclick="doReload()">Reload</button> <input type="text" value="'+url+'" id="urlElem" size="50%" onkeydown="checkSubmit(event)"> <button onclick="changeSite()">Go</button><iframe width=99% height=95% frameBoarder=0 src="'+url+'" id="mainFrame"></iframe><script>var iframe=document.getElementById("mainFrame");var urlElem=document.getElementById("urlElem");function goBack(){iframe.contentWindow.history.back();};function doReload(){iframe.contentWindow.location.reload();};function goForward() {iframe.contentWindow.history.forward();};function changeSite() {if (!urlElem.value.startsWith("/")){urlElem.value="/"+urlElem.value};iframe.src=urlElem.value};var asd="";function checkSubmit(e){if(e.key.toLowerCase()==="enter"){changeSite()}};setInterval(function() {if(iframe.contentWindow.location.href!=asd){asd=iframe.contentWindow.location.href}else{return};urlElem.value=iframe.contentWindow.location.href.replace(window.location.protocol+"//"+window.location.host, "")},500)</script></body></html>';
    html = bodyBuffer(html);
    res.setHeader('content-length', html.byteLength);
    res.setHeader('content-type', 'text/html; chartset=utf-8');
    res.end(html);
}
