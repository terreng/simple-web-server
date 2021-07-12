const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('api', {
    initipc: function(ipcMessageEvent) {
        require('electron').ipcRenderer.on('message', ipcMessageEvent);
    },
    openExternal: function(url) {
        shell.openExternal(url);
    }
})