const {app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const parseUrl = require('parseurl');
const send = require('send');
const ip = require('ip');

let mainWindow;
var config = {};
var session_ip = ip.address();
if (session_ip == "127.0.0.1") {
	session_ip = false;
}

app.on('ready', function() {
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
		app.quit()
	} else {
		//Stay running even when all windows closed
		if (process.platform === "darwin") {
			app.dock.hide();
		}
	}
})

ipcMain.on('quit', function(event) {
	app.quit()
})

ipcMain.on('saveconfig', function(event, arg1) {
	fs.writeFileSync(path.join(app.getPath('userData'), "config.json"), JSON.stringify(arg1), "utf8");
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
		width: 380,
		height: 700,
		frame: true,
		skipTaskbar: true,
		title: "Web Server",
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
		mainWindow.webContents.send('message', {"config": config, ip: session_ip});
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

createServerInstance('localhost');
if (session_ip && serverconfig.localnetwork) {
	createServerInstance(session_ip);
}

function createServerInstance(hostname) {

	const server = http.createServer(function (req, res) {
		if (req.method == "GET" || req.method == "HEAD") {

			var options = {
				root: serverconfig.path,
				lastModified: false
			};

			if (serverconfig.index == false) {
				options.index = false;
			}

			send(req, parseUrl(req).pathname, options)
				.on('error', function(error) {
					res.writeHead(error.status || 500, { 'Content-Length': '0' });
					res.end()
				})
				/*.on('directory', function() {
					
				})*/
				.on('headers', function(res, path, stat) {
					if (serverconfig.cors) {
						res.setHeader('Access-Control-Allow-Origin', '*')
					}
				})
				.pipe(res)

		} else {
			res.writeHead(405, { 'Allow': 'GET, HEAD', 'Content-Length': '0' });
			res.end()
		}
	});
	server.on('error', function(err) {
		console.error(err);
	});
	server.listen(serverconfig.port, hostname);

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