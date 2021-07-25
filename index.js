const {app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const { networkInterfaces } = require('os');
const path = require('path');
const fs = require('fs');
const http = require('http');
WSC = require("./WSC.js");

let tray //There seem to be problems with the tray discarding. Could you take a look at it?

console = function(old_console) {
	return {
		log: function() {
			var args = Array.prototype.slice.call(arguments);
			old_console.log.apply(old_console, args);
			if (mainWindow) {
				try { // Sending large values may not work... How can we fix this?
					mainWindow.webContents.send('console', {args: args, method: 'log'});
				} catch(e) {
					console.error('failed to send log')
				}
			}
		},
		warn: function() {
			var args = Array.prototype.slice.call(arguments);
			old_console.warn.apply(old_console, args);
			if (mainWindow) {
				try {
					mainWindow.webContents.send('console', {args: args, method: 'warn'});
				} catch(e) {
					console.error('failed to send log')
				}
			}
		},
		error: function() {
			var args = Array.prototype.slice.call(arguments);
			old_console.error.apply(old_console, args);
			if (mainWindow) {
				try {
					mainWindow.webContents.send('console', {args: args, method: 'error'});
				} catch(e) {
					// Don't want to cause a loop
				}
			}
		},
		assert: function() {
			var args = Array.prototype.slice.call(arguments);
			old_console.assert.apply(old_console, args);
			if (mainWindow) {
				try {
					mainWindow.webContents.send('console', {args: args, method: 'assert'});
				} catch(e) {
					console.error('failed to send log')
				}
			}
		}
	}
} (console);

const quit = function(event) {
	isQuitting = true;
	if (tray) {
		tray.destroy()
	}
    app.quit()
};

function getIPs() {
    let ifaces = networkInterfaces();
    var ips = [ ]
	for(var k in ifaces) {
		for (var i=0; i<ifaces[k].length; i++) {
			if (! (ifaces[k][i].address.startsWith('fe80:') || ifaces[k][i].address.startsWith('::'))) {
				ips.push(ifaces[k][i].address)
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
    try {
        config = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), "config.json")));
    } catch(error) {
        config = {};
    }
    createWindow();
    startServers();
})

app.on('window-all-closed', function () {
    if (config.background !== true) {
		if (tray) {
			tray.destroy()
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
    fs.writeFileSync(path.join(app.getPath('userData'), "config.json"), JSON.stringify(arg1, null, 2), "utf8");
    config = arg1;
    startServers();
})

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
        if (process.platform === "darwin") {
            app.dock.show();
        }
    }
})

function createWindow() {

    mainWindow = new BrowserWindow({
        width: 420,
        height: 700,
        frame: true,
        //skipTaskbar: true,
        title: "Simple Web Server",
        icon: "images/icon.ico",
        webPreferences: {
            //webSecurity: false,
            scrollBounce: true,
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: true,
            preload: path.join(__dirname, "preload.js")
        }
    });
    mainWindow.setMenuBarVisibility(false);

    mainWindow.loadFile('index.html');

    //mainWindow.webContents.openDevTools();
    
    mainWindow.webContents.on('did-finish-load', function() {
        mainWindow.webContents.send('message', {"config": config, ip: getIPs()});
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

var servers = [];

function startServers() {

    if (servers.length > 0) {
    var closed_servers = 0;
    for (var i = 0; i < servers.length; i++) {
        servers[i].close(function(err) {
            checkServersClosed()
        });
        servers[i].destroy();
    }
    function checkServersClosed() {
        closed_servers++;
        if (closed_servers == servers.length) {
            servers = [];
            createServers()
        }
    }
    } else {
        createServers()
    }

    function createServers() {
        for (var i = 0; i < (config.servers || []).length; i++) {
			createServer(config.servers[i]);
        }
        function createServer(serverconfig) {
            if (serverconfig.enabled) {
				var hostname = serverconfig.localnetwork ? '0.0.0.0' : '127.0.0.1';
                const server = http.createServer(function (req, res) {
                    WSC.transformRequest(req, res, serverconfig, function(requestApp) {
                        if (['GET','HEAD','PUT','POST','DELETE','OPTIONS'].includes(requestApp.request.method)) {
                            var FileSystem = new WSC.FileSystem(serverconfig.path)
                            var handler = new WSC.DirectoryEntryHandler(FileSystem, requestApp.request, requestApp.app, req, res)
                            handler.tryHandle()
                        } else {
                            res.statusCode = 501
                            res.statusMessage = 'Not Implemented'
                            res.end()
                        }
                    })
                });
                server.on('error', function(err) {
                    console.error(err);
                });
                server.listen(serverconfig.port, hostname);
                console.log('Listening on http://' + hostname + ':' + serverconfig.port)

                var connections = {}

                server.on('connection', function(conn) {
                  var key = conn.remoteAddress + ':' + conn.remotePort;
                  connections[key] = conn;
                  conn.on('close', function() {
                    delete connections[key];
                  });
                });
              
                server.destroy = function(cb) {
                  server.close(cb);
                  for (var key in connections)
                    connections[key].destroy();
                };

                servers.push(server);
            }
        }
    }
}