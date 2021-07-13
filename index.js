const {app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
var config = {};

app.on('ready', function() {
	createWindow();
})

app.on('window-all-closed', function () {
	/*if (process.platform !== 'darwin') {
		app.quit()
	}*/
	//Stay running even when all windows closed
	if (process.platform === "darwin") {
		app.dock.hide();
	}
})

ipcMain.on('quit', function(event) {
	app.quit()
})

ipcMain.on('saveconfig', function(event, arg1) {
	fs.writeFileSync(path.join(app.getPath('userData'), "config.json"), JSON.stringify(arg1), "utf8");
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
		try {
			config = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), "config.json")));
		} catch(error) {
			config = {};
		}

		mainWindow.webContents.send('message', config);
	});

	mainWindow.on('closed', function () {
		mainWindow = null
	});

}