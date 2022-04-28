const {app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell} = require('electron');
const {networkInterfaces} = require('os');

global.savingLogs = false;
global.pendingSave = false;

const {URL} = require('url');
global.URL = URL;
global.http = require('http');
global.https = require('https');
global.net = require('net');
global.forge = require('node-forge');
global.fs = require('fs');
global.path = require('path');
global.atob = require("atob");
global.Blob = require('node-blob');
global.zlib = require('zlib');
const {pipeline} = require('stream');
global.pipeline = pipeline;

global.WSC = require("./WSC.js");
WSC.handleProxyGet = require("./proxy.js");

//let tray //There seem to be problems with the tray discarding.


console = function(old_console) {
    var new_console = {
        logs: [],
        fs: new WSC.FileSystem(app.getPath('userData')),
        saveLogs: function() {
            if (global.savingLogs) {
                global.pendingSave = true
                return
            }
            global.savingLogs = true
            global.pendingSave = false
            var a = console.logs
            console.logs = [ ]
            var q = '\n'
            for (var i=0; i<a.length; i++) {
                if (a[i].length == 1) {
                    var q = q + a[i][0];
                } else {
                    var b = '';
                    for (var t=0; t<a[i].length; t++) {
                        if (typeof a[i][t] !== 'object') {
                            var b = b+ a[i][t] + ' ';
                        } else {
                            var b = b + JSON.stringify(a[i][t], null, 2);
                        }
                    }
                    var q = q + b;
                }
            }
            var newData = q;
            console.fs.getByPath('/server.log', function(file) {
                if (file && ! file.error) {
                    file.file(function(data) {
                        var data = data + newData;
                        console.fs.writeFile('/server.log', data, function(e) { global.savingLogs = false; if (global.pendingSave) {console.saveLogs()} }, true);
                    })
                } else {
                    console.fs.writeFile('/server.log', newData, function(e) { global.savingLogs = false; if (global.pendingSave) {console.saveLogs()} }, false);
                }
            })
        }
    }
    for (var k in old_console) {
        new_console[k] = function(method) {
            return function() {
                var args = Array.prototype.slice.call(arguments);
                old_console[method].apply(old_console, args);
                if (['log', 'warn', 'error'].includes(method)) {
                    console.logs.push(args);
                    console.saveLogs();
                }
                if (mainWindow && mainWindow.webContentsLoaded) {
                    try {
                        mainWindow.webContents.send('console', {args: args, method: method});
                    } catch(e) {
                        try {
                            mainWindow.webContents.send('console', {args: ['failed to send log to window'], method: 'warn'});
                        } catch(e) {}
                        old_console.error('failed to send log')
                    }
                }
            }
        }(k)
    }
    return new_console;
}(console)


const quit = function(event) {
    isQuitting = true;
    //if ('undefined' != typeof tray) {
    //    tray.destroy()
    //}
    app.quit()
};

function getIPs() {
    let ifaces = networkInterfaces();
    var ips = []
    for (var k in ifaces) {
        for (var i=0; i<ifaces[k].length; i++) {
            if (!ifaces[k][i].address.startsWith('fe80::')) { //this is basically 127.0.0.1 for IPv6
                ips.push([ifaces[k][i].address, ifaces[k][i].family.toLowerCase()])
            }
        }
    }
    return ips
}

let mainWindow;
var config = {};

if (!app.requestSingleInstanceLock()) {
    app.quit()
}

app.on('second-instance', function (event, commandLine, workingDirectory) {
    if (mainWindow) {
        mainWindow.show();
    }
})

app.on('ready', function() {
    if (!app.requestSingleInstanceLock()) {
        return;
    }
    /**
    tray = new Tray('images/icon.ico')
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show', click:  function(){ if (mainWindow) {mainWindow.show()} } },
      { label: 'Exit', click:  function(){ quit() } }
    ])
    tray.setToolTip('Simple Web Server')
    tray.setContextMenu(contextMenu)
    tray.on('click', function(e){
        if (mainWindow) {
            mainWindow.show();
        }
    })
    */
    try {
        config = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), "config.json")));
    } catch(error) {
        config = {};
    }
    for (var i = 0; i < (config.servers || []).length; i++) {
        if (config.servers[i].httpsKey && config.servers[i].httpsCert) {
            config.servers[i].httpsKey = '-----BEGIN RSA PRIVATE KEY-----'+config.servers[i].httpsKey.split('-----BEGIN RSA PRIVATE KEY-----').pop().split('-----END RSA PRIVATE KEY-----')[0].replace(/ /g, '\r\n')+'-----END RSA PRIVATE KEY-----';
            config.servers[i].httpsCert = '-----BEGIN CERTIFICATE-----'+config.servers[i].httpsCert.split('-----BEGIN CERTIFICATE-----').pop().split('-----END CERTIFICATE-----')[0].replace(/ /g, '\r\n')+'-----END CERTIFICATE-----';
        }
    }
    if (mainWindow == null) {
    createWindow();
    }
    startServers();
})

app.on('window-all-closed', function () {
    if (config.background !== true) {
        //if (tray) {
        //    tray.destroy()
        //}
        app.quit()
    } else {
        //Stay running even when all windows closed
        if (process.platform === "darwin") {
            app.dock.hide();
        }
    }
})

var isQuitting = false;

ipcMain.on('quit', quit)

ipcMain.on('saveconfig', function(event, arg1) {
    fs.writeFileSync(path.join(app.getPath('userData'), "config.json"), JSON.stringify(arg1, null, 2), "utf8");
    config = arg1;
    startServers();
})

ipcMain.handle('showPicker', async (event, arg) => {
    var result = await dialog.showOpenDialog(mainWindow, {
        defaultPath: arg.current_path || undefined,
        properties: ['openDirectory', 'createDirectory']
    });
    return result.filePaths;
});

ipcMain.handle('generateCrypto', async (event, arg) => {
    return WSC.createCrypto();
});

app.on('activate', function () {
    if (!app.requestSingleInstanceLock()) {
        return;
    }
    if (mainWindow == null) {
        createWindow()
        if (process.platform === "darwin") {
            app.dock.show();
        }
    }
})

var lastIps = getIPs()
setInterval(function() {
    // I did some research, this is the best way to do this
    var ips = getIPs()
    var newIp = false
    if (lastIps.length !== ips.length || JSON.stringify(lastIps) === ips) {
        newIp = true
    }
    lastIps = ips;
    if (newIp === true) {
        //variable ips contains new ips
    }
}, 20000) //every 20 seconds

function createWindow() {

    mainWindow = new BrowserWindow({
        backgroundColor: '#ffffff',//TODO: adjust based on dark mode
        width: 420,
        minWidth: 280,
        height: 700,
        minHeight: 200,
        frame: true,
        //skipTaskbar: true,
        title: "Simple Web Server",
        icon: "images/icon.ico",
        webPreferences: {
            scrollBounce: false,
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: true,
            sandbox: true,
            preload: path.join(__dirname, "preload.js")
        }
    });
    mainWindow.setMenuBarVisibility(false);

    mainWindow.loadFile('index.html');

    //mainWindow.webContents.openDevTools();
    
    mainWindow.webContents.on('did-finish-load', function() {
        mainWindow.webContentsLoaded = true;
        mainWindow.webContents.send('message', {"type": "init", "config": config, ip: getIPs()});
        updateServerStates();
    });

    mainWindow.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });

    mainWindow.on('close', function (event) {
        if (config.background && process.platform == "win32" && !isQuitting) {
            mainWindow.hide();
            event.preventDefault();
        }
    });

    mainWindow.on('closed', function () {
        mainWindow = null
    });

}

function updateServerStates() {
    if (mainWindow && mainWindow.webContentsLoaded) {
        var server_states = running_servers.map(function(a) {
            return {
                "config": a.config,
                "state": a.state,
                "error_message": a.error_message
            }
        });
        mainWindow.webContents.send('message', {"type": "state", "server_states": server_states});
    }
}

var running_servers = [];

function startServers() {

    if (running_servers.length > 0) {

    var closed_servers = 0;
    var need_close_servers = running_servers.length;

    for (var i = 0; i < running_servers.length; i++) {

        var found_matching_config = false;
        for (var e = 0; e < (config.servers || []).length; e++) {
            if (configsEqual(config.servers[e], running_servers[i].config)) {
                found_matching_config = true;
            }
        }

        if (found_matching_config) {
            need_close_servers--;
        } else {
            running_servers[i].deleted = true;
            console.log('Killing server on port ' + running_servers[i].config.port);
            running_servers[i].server.destroy(function() {
                closed_servers++;
                checkServersClosed();
            });
        }
    }

    function checkServersClosed() {
        for (var i = running_servers.length-1; i > -1; i--) {
            if (running_servers[i].deleted) {
                running_servers.splice(i, 1);
            }
        }

        if (closed_servers == need_close_servers) {
            createServers()
        }
    }

    checkServersClosed()

    } else {
        createServers()
    }

    function createServers() {
        for (var i = 0; i < (config.servers || []).length; i++) {
            createServer(config.servers[i]);
        }
        updateServerStates();
        function createServer(serverconfig) {
            var found_already_running = false;
            for (var e = 0; e < running_servers.length; e++) {
                if (configsEqual(running_servers[e].config, serverconfig)) {
                    found_already_running = true;
                }
            }
            if (serverconfig.enabled && !found_already_running) {
                var this_server = {"config":serverconfig,"state":"starting"};
                var hostname = serverconfig.localnetwork ? (serverconfig.ipv6 ? '::' : '0.0.0.0') : '127.0.0.1';
                if (serverconfig.https) {
                    if (!serverconfig.httpsKey || !serverconfig.httpsCert) {
                        var crypto = WSC.createCrypto();
                        var server = https.createServer({key: crypto.privateKey, cert: crypto.cert});
                    } else {
                        var server = https.createServer({key: serverconfig.httpsKey, cert: serverconfig.httpsCert});
                    }
                } else {
                    var server = http.createServer();
                }
                this_server.server = server;
                
                var FileSystem = null;
                if (serverconfig.proxy) {
                    server.on('connect', WSC.proxy.connect);
                    WSC.proxy.setupWebsocket(server);
                } else {
                    FileSystem = new WSC.FileSystem(serverconfig.path);
                }
                server.on('request', function(req, res) {
                    WSC.onRequest(serverconfig, req, res, FileSystem);
                });
                server.on('clientError', function (err, socket) {
                    if (err.code === 'ECONNRESET' || !socket.writable) {
                        return;
                    }
                    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
                });
                server.on('error', function(err) {
                    console.error(err);
                    this_server.state = "error";
                    this_server.error_message = err.message;
                    updateServerStates();
                });
                server.on('listening', function() {
                    console.log('Listening on ' + (serverconfig.https ? 'https' : 'http') + '://' + hostname + ':' + serverconfig.port)
                    this_server.state = "running";
                    updateServerStates();
                });
                server.listen(serverconfig.port, hostname);
                var connections = {}
                server.on('connection', function(conn) {
                    var k = conn.remoteAddress + ':' + conn.remotePort;
                    connections[k] = conn;
                    conn.on('close', function() {
                        delete connections[k];
                    });
                });
                server.destroy = function(cb) {
                    server.close(cb);
                    for (var k in connections)
                        connections[k].destroy();
                };
                running_servers.push(this_server);
            }
        }
    }
}

function configsEqual(config1, config2) {
    if (JSON.stringify(Object.keys(config1).sort()) == JSON.stringify(Object.keys(config2).sort())) {
        for (var o = 0; o < Object.keys(config1).length; o++) {
            if (JSON.stringify(config1[Object.keys(config1)[o]]) !== JSON.stringify(config2[Object.keys(config1)[o]])) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}
