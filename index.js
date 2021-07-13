const {app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;
var config = {};

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
		mainWindow.webContents.send('message', config);
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

	const server = http.createServer(function (req, res) {
		//console.log(req);
		res.writeHead(200, { 'Content-Type': "text/plain; charset=utf-8", 'Content-Length': Buffer.byteLength("hello", "utf-8") });
		res.write("hello", "utf-8");
		res.end();
	});
	server.on('error', function(err) {
		console.error(err);
	});
	server.listen(serverconfig.port, 'localhost');

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

	console.log("started")

	servers.push(server);

}

}

}