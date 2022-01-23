const { contextBridge, ipcRenderer, shell, app } = require('electron');

ipcRenderer.on('console', function(event, data) {
	console[data.method].apply(console, data.args)
});

contextBridge.exposeInMainWorld('api', {
    initipc: function(ipcMessageEvent) {
        ipcRenderer.on('message', ipcMessageEvent);
    },
    openExternal: function(url) {
        shell.openExternal(url);
    },
    quit: function() {
        ipcRenderer.send("quit");
    },
    showPicker: async function(current_path) {
        var result = await ipcRenderer.invoke('showPicker', {"current_path": current_path});
        return result;
    },
    saveconfig: function(saveconfig) {
        ipcRenderer.send("saveconfig", saveconfig);
    },
    generateCrypto: async function() {
        var crypto = await ipcRenderer.invoke('generateCrypto');
        return crypto;
    },
})