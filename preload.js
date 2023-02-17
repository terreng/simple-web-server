const { contextBridge, ipcRenderer, shell, app } = require('electron');

ipcRenderer.on('console', (event, data) => {
    console[data.method].apply(console, data.args)
});

contextBridge.exposeInMainWorld('api', {
    initipc: ipcMessageEvent => {
        ipcRenderer.on('message', ipcMessageEvent);
    },
    openExternal: url => {
        ipcRenderer.invoke('openExternal', {"url": url});
    },
    quit: () => ipcRenderer.send("quit"),
    showPicker: current_path => {
        return ipcRenderer.invoke('showPicker', {"current_path": current_path});
    },
    showPickerForPlugin: select_type => {
        return ipcRenderer.invoke('showPickerForPlugin', {"select_type": select_type});
    },
    addPlugin: path => {
        return ipcRenderer.invoke('addPlugin', {"path": path});
    },
    checkPlugin: path => {
        return ipcRenderer.invoke('checkPlugin', {"path": path});
    },
    removePlugin: pluginid => {
        return ipcRenderer.invoke('removePlugin', {"id": pluginid});
    },
    saveconfig: (config, reload) => {
        ipcRenderer.send("saveconfig", {"config": config, "reload": reload});
    },
    generateCrypto: () => {
        return ipcRenderer.invoke('generateCrypto');
    }
})