const {app, BrowserWindow } = require('electron');
const fs = require('fs');

let mainWindow;

app.on('ready', function() {
	createWindow();
	if (process.platform === "darwin") {
		app.dock.hide();
	}
})

app.on('window-all-closed', function () {
	/*if (process.platform !== 'darwin') {
		app.quit()
	}*/
	//Stay running even when all windows closed
})

app.on('activate', function () {
	if (mainWindow === null) {
		createWindow()
	}
})

function createWindow() {

	mainWindow = new BrowserWindow({
		width: 400,
		height: 700,
		frame: true,
		skipTaskbar: true,
		webPreferences: {
			webSecurity: false,
		}
	});
	mainWindow.setMenuBarVisibility(false);

	mainWindow.loadFile('index.html')
	
	mainWindow.webContents.on('did-finish-load', function() {

	});

	mainWindow.on('closed', function () {
		mainWindow = null
	});

}