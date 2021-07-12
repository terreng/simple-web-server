const { contextBridge, ipcRenderer, shell, app } = require('electron');

contextBridge.exposeInMainWorld('api', {
    initipc: function(ipcMessageEvent) {
        ipcRenderer.on('message', ipcMessageEvent);
    },
    openExternal: function(url) {
        shell.openExternal(url);
    },
    quit: function() {
        ipcRenderer.send("quit");
    }
})