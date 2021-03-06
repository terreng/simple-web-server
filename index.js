var version = 1001004;
var install_source = "website"; //"website" | "microsoftstore" | "macappstore"
const {app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell} = require('electron');
const {networkInterfaces} = require('os');

global.savingLogs = true;//prevent saving logs until log option is checked. never becomes false if logging is not enabled.
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
var path = global.path;
global.pipeline = pipeline;

WSC = require("./WSC.js");

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

process.on('uncaughtException', function(e) {
    // this won't respond to the client, but at least we have the error.
    console.warn('Uncaught Exception: ', e);
});

const quit = function(event) {
    isQuitting = true;
    if (global.tray) {
        global.tray.destroy()
    }
    app.quit()
};

function getIPs() {
    let ifaces = networkInterfaces();
    var ips = []
    for (var k in ifaces) {
        for (var i=0; i<ifaces[k].length; i++) {
            if (!ifaces[k][i].address.startsWith('fe80::') && ['IPv4', 'IPv6'].includes(ifaces[k][i].family)) {
                ips.push([ifaces[k][i].address, ifaces[k][i].family.toLowerCase()])
            }
        }
    }
    return ips;
}

let mainWindow;
var config = {};
var mas_bookmarks = {};

if (!process.mas && !app.requestSingleInstanceLock()) {
    app.quit();
}

app.on('second-instance', function (event, commandLine, workingDirectory) {
    if (mainWindow) {
        mainWindow.show();
    }
})

app.on('ready', function() {
    if (!process.mas && !app.hasSingleInstanceLock()) {
        return;
    }
    try {
        config = fs.readFileSync(path.join(app.getPath('userData'), "config.json"), "utf8");
    } catch(error) {
        config = "{}";
    }
    try {
        config = JSON.parse(config);
    } catch(error) {
        dialog.showErrorBox("Failed to parse config.json", "Something went wrong while parsing config.json. The file is improperly formatted.");
        app.quit();
    }
    if (config.log == true) {
        global.savingLogs = false;
        if (global.pendingSave) {console.saveLogs()}
    }

    if (process.mas || true) {
        try {
            mas_bookmarks = fs.readFileSync(path.join(app.getPath('userData'), "mas_bookmarks.json"), "utf8");
        } catch(error) {
            mas_bookmarks = "{}"
        }
        try {
            mas_bookmarks = JSON.parse(mas_bookmarks);
        } catch(error) {
            mas_bookmarks = {};
        }
    }

    if (config.tray) {
        global.tray = new Tray(path.join(__dirname, "images/icon.ico"))
        const contextMenu = Menu.buildFromTemplate([
          { label: 'Show', click:  function(){ if (mainWindow) {mainWindow.show()} } },
          { label: 'Exit', click:  function(){ quit() } }
        ])
        global.tray.setToolTip('Simple Web Server')
        global.tray.setContextMenu(contextMenu)
        global.tray.on('click', function(e){
            if (mainWindow == null) {
                createWindow()
                if (process.platform === "darwin") {
                    app.dock.show();
                }
            } else {
                mainWindow.show();
            }
        })
    }

    if (mainWindow == null) {
    createWindow();
    }
    console.log("\n"+((new Date()).toLocaleString()+"\n"));
    startServers();
    checkForUpdates();
    setInterval(function() {
        checkForUpdates()
    }, 1000*60*60) //Every hour
})

app.on('window-all-closed', function () {
    if (config.background !== true) {
        if (global.tray) {
            global.tray.destroy()
        }
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
    fs.writeFile(path.join(app.getPath('userData'), "config.json"), JSON.stringify(arg1, null, 2), "utf8", function(err) {
        if (err) {
            console.error(err);
        }
    });
    config = arg1;
    if (config.updates == true && install_source !== "macappstore" && last_update_check_skipped == true) {
        checkForUpdates();
    }
    if (config.updates == false || install_source == "macappstore") {
        last_update_check_skipped = true;
    }
    startServers();
})

ipcMain.handle('showPicker', async (event, arg) => {
    var result = await dialog.showOpenDialog(mainWindow, {
        defaultPath: arg.current_path || undefined,
        properties: ['openDirectory', 'createDirectory'],
        securityScopedBookmarks: true
    });
    if (result.filePaths && result.filePaths.length > 0 && result.bookmarks && result.bookmarks.length > 0) {
        addToSecurityScopedBookmarks(result.filePaths[0], result.bookmarks[0]);//Will only be called in mas build
    }
    return result.filePaths;
});

function addToSecurityScopedBookmarks(filepath, bookmark) {
    if (bookmark && bookmark.length > 0) {
        mas_bookmarks[filepath] = {"bookmark": bookmark};
        fs.writeFile(path.join(app.getPath('userData'), "mas_bookmarks.json"), JSON.stringify(mas_bookmarks, null, 2), "utf8", function(err) {
            if (err) {
                console.error(err);
            }
        });
    }
}

// Provide path, returns bookmark
function matchSecurityScopedBookmark(filepath) {
    var matching_bookmarks = Object.keys(mas_bookmarks).filter(function(a) {
        return filepath.startsWith(a) && (filepath.length == a.length || ["/","\\"].indexOf(filepath.substring(a.length,a.length+1)) > -1);
    });
    if (matching_bookmarks.length > 0) {
        var longest_matching_bookmark = matching_bookmarks.reduce(function(a, b) {return a.length > b.length ? a : b;});
        return mas_bookmarks[longest_matching_bookmark].bookmark;
    } else {
        return null;
    }
}

// Provide path, accesses and then returns bookmark
function matchAndAccessSecurityScopedBookmark(filepath) {
    var bookmark = matchSecurityScopedBookmark(filepath);
    accessSecurityScopedBookmark(bookmark);
    return bookmark;
}

var in_use_mas_bookmarks = {};

// Accesses bookmark
function accessSecurityScopedBookmark(bookmark) {
    if (!bookmark) {
        return;
    }
    if (in_use_mas_bookmarks[bookmark]) {
        in_use_mas_bookmarks[bookmark].count++;
    } else {
        var stopAccessing = app.startAccessingSecurityScopedResource(bookmark);
        in_use_mas_bookmarks[bookmark] = {
            count: 1,
            stopAccessing: stopAccessing
        };
    }
}

// Release bookmark
function releaseSecurityScopedBookmark(bookmark) {
    if (!bookmark) {
        return;
    }
    if (in_use_mas_bookmarks[bookmark]) {
        in_use_mas_bookmarks[bookmark].count--;
        if (in_use_mas_bookmarks[bookmark].count == 0) {
            in_use_mas_bookmarks[bookmark].stopAccessing();
            delete in_use_mas_bookmarks[bookmark];
        }
    } else {
        throw new Error("Attempting to release security scoped bookmark that wasn't accessed");
    }
}

global.bookmarks = {
    match: matchSecurityScopedBookmark,
    matchAndAccess: matchAndAccessSecurityScopedBookmark,
    access: accessSecurityScopedBookmark,
    release: releaseSecurityScopedBookmark
}

ipcMain.handle('generateCrypto', async (event, arg) => {
    return WSC.createCrypto();
});

app.on('activate', function () {
    if (!process.mas && !app.hasSingleInstanceLock()) {
        return;
    }
    if (mainWindow == null) {
        createWindow()
        if (process.platform === "darwin") {
            app.dock.show();
        }
    }
})

var lastIps = [];
setInterval(function() {
    var ips = getIPs()
    var ipsChanged = false
    if (lastIps.length !== ips.length || JSON.stringify(lastIps.sort(function(a, b){if(a[0] < b[0]) {return -1;}; if(a[0] > b[0]) {return 1;}; return 0;})) !== JSON.stringify(ips.sort(function(a, b){if(a[0] < b[0]) {return -1;}; if(a[0] > b[0]) {return 1;}; return 0;}))) {
        ipsChanged = true
    }
    if (ipsChanged === true) {
        lastIps = ips;
        if (mainWindow && mainWindow.webContentsLoaded) {
            mainWindow.webContents.send('message', {"type": "ipchange", ip: ips});
            console.log("["+(new Date()).toLocaleString()+"] IP(s) changed: "+JSON.stringify(ips));
        }
    }
}, 5000) //every 5 seconds

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
        icon: path.join(__dirname, "images/icon.ico"),
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
        lastIps = getIPs()
        mainWindow.webContents.send('message', {"type": "init", "config": config, ip: lastIps, install_source: install_source});
        if (update_info) {
            mainWindow.webContents.send('message', {"type": "update", "url": update_info.url, "text": update_info.text, "attributes": update_info.attributes});
        }
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
            console.log("["+(new Date()).toLocaleString()+'] Killing server on port ' + running_servers[i].config.port);
            if (running_servers[i].server) {
                running_servers[i].server.destroy(function() {
                    closed_servers++;
                    checkServersClosed();
                });
            } else {
                closed_servers++;
                checkServersClosed();
            }
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

                var hostname = serverconfig.localnetwork ? (serverconfig.ipv6 ? '::' : '0.0.0.0') : (serverconfig.ipv6 ? '::1' : '127.0.0.1');
                try {
                if (serverconfig.https) {
                    if (!serverconfig.httpsKey || !serverconfig.httpsCert) {
                        var crypto = WSC.createCrypto();
                        var server = https.createServer({key: crypto.privateKey, cert: crypto.cert});
                    } else {
                        var server = https.createServer({key:  ('-----BEGIN RSA PRIVATE KEY-----'+config.servers[i].httpsKey.split('-----BEGIN RSA PRIVATE KEY-----').pop().split('-----END RSA PRIVATE KEY-----')[0].replace(/ /g, '\r\n')+'-----END RSA PRIVATE KEY-----'), cert: ('-----BEGIN CERTIFICATE-----'+config.servers[i].httpsCert.split('-----BEGIN CERTIFICATE-----').pop().split('-----END CERTIFICATE-----')[0].replace(/ /g, '\r\n')+'-----END CERTIFICATE-----')});
                    }
                } else {
                    var server = http.createServer();
                }
                } catch(err) {
                    console.error(err);
                    this_server.state = "error";
                    this_server.error_message = (serverconfig.https ? "There is probably something wrong with your HTTPS certificate and key.\n" : "") + err.message;
                    running_servers.push(this_server);
                    return;
                }
                this_server.server = server;
                /*
                if (serverconfig.proxy) {
                    server.on('connect', (req, clientSocket, head) => {
                        console.log(req.socket.remoteAddress + ':', 'Request',req.method, req.url)
                        const { port, hostname } = new URL(`http://${url}`)
                        const serverSocket = net.connect(port || 443, hostname, () => {
							console.log('a')
                            clientSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                                               'Proxy-agent: Simple-Web-Server-Proxy\r\n' +
                                               '\r\n')
                            serverSocket.write(head)
                            serverSocket.pipe(clientSocket)
                            clientSocket.pipe(serverSocket)
                        })
                    })
                }
                */
                var FileSystem = new WSC.FileSystem(serverconfig.path);
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
                    console.log("["+(new Date()).toLocaleString()+'] Listening on ' + (serverconfig.https ? 'https' : 'http') + '://' + hostname + ':' + serverconfig.port)
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

var update_info;
var last_update_check_skipped = false;

function checkForUpdates() {
    if (config.updates == true && install_source !== "macappstore") {
        last_update_check_skipped = false;
        var req = global.https.request({
            hostname: 'simplewebserver.org',
            port: 443,
            path: '/versions/'+version+".json",
            method: 'GET'
        }, function(res) {
            if (res.statusCode == 200) {
                res.on('data', function(data) {
                    try {
                        var version_update = JSON.parse(data);
                    } catch (e) {
                        console.log("["+(new Date()).toLocaleString()+"] Update check failed (invalid response)");
                    }
                    if (version_update.update) {
                        if (version_update.download[install_source] !== (update_info || {}).url) {
                            console.log("["+(new Date()).toLocaleString()+"] Update available: "+version_update.download[install_source])
                        }
                        update_info = {"url": version_update.download[install_source], "text": version_update.banner_text, "attributes": JSON.parse(version_update.attributes || '[]')};
                        if (mainWindow.webContentsLoaded) {
                            mainWindow.webContents.send('message', {"type": "update", "url": update_info.url, "text": update_info.text, "attributes": update_info.attributes});
                        }
                    }
                })
            } else {
                console.log("["+(new Date()).toLocaleString()+"] Update check failed (status code "+res.statusCode+")");
            }
        })
        
        req.on('error', function(error) {
            console.log("["+(new Date()).toLocaleString()+"] Update check failed");
            console.log(error)
        })
        
        req.end();
    } else {
        last_update_check_skipped = true;
    }
}
