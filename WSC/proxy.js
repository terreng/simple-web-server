function connect(req, clientSocket, head) {
    console.log(req.socket.remoteAddress + ':', 'Request',req.method, req.url);
    const {port, hostname} = new URL('http://'+req.url);
    const serverSocket = net.connect(port || 443, hostname, () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                           'Proxy-agent: Simple-Web-Server-Proxy\r\n' +
                           '\r\n')
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);
    })
    serverSocket.on('error', function(e) {});
    clientSocket.on('error', function(e) {});
}

function get(req, res, serverconfig) {
    console.log(req.socket.remoteAddress + ':', 'Request', req.method, req.url);
    if (!req.url.startsWith('/')) {
        var protReq = req.url.startsWith('https:') ? https : http;
        var req2 = protReq.request(req.url, {method: req.method, headers: req.headers});
        req2.on('error', function(e){res.end('error')});
        req2.on('response', function(res2) {
            for (var k in res2.headers) {
                res.setHeader(k, res2.headers[k]);
            }
            res.writeHead(res2.statusCode);
            res2.pipe(res);
        })
        res.on('end', req2.end);
        req.pipe(req2);
        return;
    }
    WSC.handleProxyGet(req, res, serverconfig);
}




module.exports = {connect:connect, get:get};
