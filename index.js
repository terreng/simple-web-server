const install_source = process.mas ? "macappstore" : (process.windowsStore ? "microsoftstore" : "website");
const {app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell, nativeTheme} = require('electron');
const {networkInterfaces} = require('os');
var chokidar;
if (!process.mas) {chokidar = require('chokidar')}
global.hostOS = require('os').platform();
global.eApp = app;
global.tray = undefined;

global.savingLogs = true;//prevent saving logs until log option is checked. never becomes false if logging is not enabled.
global.pendingSave = false;

global.URL = require('url').URL;
global.http = require('http');
global.https = require('https');
global.net = require('net');
global.forge = require('node-forge');
global.fs = require('fs');
global.path = require('path');
global.atob = require("atob");
global.Blob = require('node-blob');
global.zlib = require('zlib');
global.pipeline = require('stream').pipeline;

global.bookmarks = require('./bookmarks.js');
global.plugin = require('./plugin.js');
global.WSC = require("./WSC.js");

const languages = {
    "en": "English",
    "es": "Español",
    "ru": "Русский",
    "zh_CN": "简体中文",
    "ja": "日本語",
    "fr_FR": "Français",
    "pt_PT": "Português",
    "it_IT": "Italiano",
    "uk": "Українська",
    "de": "Deutsch",
    "sv": "Svenska",
}

console = function(old_console) {
    let new_console = {
        logs: [],
        fs: new WSC.FileSystem(app.getPath('userData')),
        saveLogs: function() {
            if (global.savingLogs) {
                global.pendingSave = true;
                return;
            }
            global.savingLogs = true;
            global.pendingSave = false;
            const logs = console.logs;
            console.logs = [];
            let newData = '\n';
            for (let i=0; i<logs.length; i++) {
                if (logs[i].length === 1) {
                    newData += logs[i][0];
                } else {
                    let b = '';
                    for (let t=0; t<logs[i].length; t++) {
                        if (typeof logs[i][t] !== 'object') {
                            b += (logs[i][t] + ' ');
                        } else {
                            try {
                                b += JSON.stringify(logs[i][t], null, 2);
                            } catch(e) {
                                b += 'Console save error: Error stringifying json';
                            }
                        }
                    }
                    newData += b;
                }
            }
            console.fs.getByPath('/server.log', function(file) {
                if (file && !file.error) {
                    file.file(data => {
                        console.fs.writeFile('/server.log', data+newData, () => {
                            global.savingLogs = false;
                            if (global.pendingSave) console.saveLogs();
                        }, true);
                    })
                } else {
                    console.fs.writeFile('/server.log', newData, () => {
                        global.savingLogs = false;
                        if (global.pendingSave) console.saveLogs();
                    }, false);
                }
            })
        }
    }
    for (const k in old_console) {
        new_console[k] = function(method) {
            return function() {
                const args = Array.prototype.slice.call(arguments);
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
                            mainWindow.webContents.send('console', {args: ['Failed to send log to window'], method: 'warn'});
                        } catch(e) {}
                        old_console.error('Failed to send log');
                    }
                }
            }
        }(k);
    }
    return new_console;
}(console)

process.on('uncaughtException', function(e) {
    // this won't respond to the client, but at least we have the error.
    console.error('Uncaught Exception: ', e);
});

const quit = function(event) {
    isQuitting = true;
    removeTray()
    app.quit()
};

function getIPs() {
    const ifaces = networkInterfaces();
    let ips = []
    for (const k in ifaces) {
        for (let i=0; i<ifaces[k].length; i++) {
            if (!ifaces[k][i].address.startsWith('fe80::') && ['IPv4', 'IPv6'].includes(ifaces[k][i].family)) {
                ips.push([ifaces[k][i].address, ifaces[k][i].family.toLowerCase()])
            }
        }
    }
    return ips;
}

let mainWindow = null;
let config = {};

if (!process.mas && !app.requestSingleInstanceLock()) app.quit();

app.on('second-instance', function (event, commandLine, workingDirectory) {
    if (mainWindow) mainWindow.show();
})

let reload_plugins_timeout = undefined;
let reload_plugin_ids = [];

app.on('ready', function() {
    if (!process.mas && !app.hasSingleInstanceLock()) return;

    if (!fs.existsSync(path.join(app.getPath('userData'), "config.json"))) {
        fs.writeFileSync(path.join(app.getPath('userData'), "config.json"), JSON.stringify({}, null, 2));
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
    if (config.log === true) {
        global.savingLogs = false;
        if (global.pendingSave) console.saveLogs();
    }

    try {
        if (!process.mas) {
            chokidar.watch(path.join(app.getPath('userData'), "config.json"), {
                ignored: /(^|[\/\\])\../, // ignore dotfiles
                ignoreInitial: true,
                awaitWriteFinish: {
                    stabilityThreshold: 500,
                    pollInterval: 100
                }
            }).on('change', (filepath) => {
                configFileChanged()
            });
        } else {
            fs.watch(path.join(app.getPath('userData'), "config.json"), function(eventType, filename) {
                configFileChanged()
            });
        }

        function configFileChanged() {
            let new_config;
            try {
                new_config = fs.readFileSync(path.join(app.getPath('userData'), "config.json"), "utf8");
            } catch(error) {
                new_config = "{}";
            }
            try {
                new_config = JSON.parse(new_config);
            } catch(error) {
                dialog.showErrorBox("Failed to parse config.json", "Something went wrong while parsing config.json. The file is improperly formatted.");
                app.quit();
            }

            if (JSON.stringify(new_config) !== JSON.stringify(config)) {
                console.log("["+(new Date()).toLocaleString()+"] config.json changed. Reloading UI.");
                config = new_config;
                configChanged();
                if (mainWindow && mainWindow.webContentsLoaded) {
                    mainWindow.webContents.send('message', {"type": "reload"});
                }
            }
        }
    } catch(e) {
        console.log("fs.watch or chokidar error or unsupported. App will not automatically update for changes to config.json.");
        console.error(e);
    }

    if (!fs.existsSync(path.join(app.getPath('userData'), "plugins"))) {
        fs.mkdirSync(path.join(app.getPath('userData'), "plugins"));
    }

    try {
        var plugin_dir = path.join(app.getPath('userData'), "plugins/");
        if (!process.mas) {
            chokidar.watch(plugin_dir, {
                ignored: /(^|[\/\\])\../, // ignore dotfiles
                ignoreInitial: true,
                awaitWriteFinish: {
                    stabilityThreshold: 500,
                    pollInterval: 100
                }
            }).on('all', (event, filepath) => {
                var pluginid = filepath.split(plugin_dir)[1].split("/")[0].split("\\")[0];
                pluginsDirectoryChanged(pluginid)
            })
        } else {
            fs.watch(plugin_dir, {recursive: true}, function(eventType, filename) {
                var pluginid = filename.split("/")[0].split("\\")[0];
                pluginsDirectoryChanged(pluginid)
            })
        }

        function pluginsDirectoryChanged(pluginid) {
            if (pluginid.match(/^[A-Za-z0-9\-_]+$/)) {

                if (reload_plugins_timeout) {
                    clearTimeout(reload_plugins_timeout);
                }
        
                reload_plugin_ids.push(pluginid);
        
                reload_plugins_timeout = setTimeout(function() {
                    console.log("["+(new Date()).toLocaleString()+"] Plugins changed unexpectedly. Restarting affected servers and reloading UI if necessary.");

                    reload_plugin_ids = reload_plugin_ids.filter((item, i, ar) => ar.indexOf(item) === i);
                    for (let e=0; e<reload_plugin_ids.length; e++) {
                        restartServersWithPlugins(reload_plugin_ids[e]);
                    }
                    reload_plugin_ids = [];
                    if (mainWindow && mainWindow.webContentsLoaded) {
                        mainWindow.webContents.send('message', {"type": "pluginschange", plugins: plugin.getInstalledPlugins()});
                    }
                    reload_plugins_timeout = undefined;
                }, 200);

            }
        }
    } catch(e) {
        console.log("fs.watch or chokidar error or unsupported. App will not automatically update for changes to plugins.");
        console.error(e);
    }
    
    bookmarks.init();

    if (config.tray) {
        createTray();
    }

    if (process.platform === 'darwin') {
        const menu = Menu.buildFromTemplate([
            { role: 'appMenu' },
            { role: 'fileMenu' },
            { role: 'editMenu' },
            { role: 'viewMenu' },
            { role: 'windowMenu' },
            {
                role: 'help',
                submenu: [
                    {
                        label: 'Documentation',
                        click: async () => {
                            await shell.openExternal('https://simplewebserver.org/docs')
                        }
                    },
                    {
                        label: 'Issues && Suggestions',
                        click: async () => {
                            await shell.openExternal('https://github.com/terreng/simple-web-server/issues')
                        }
                    }
                ]
            }
        ])
        Menu.setApplicationMenu(menu)
    }

    nativeTheme.themeSource = config.theme || "system";

    if (mainWindow === null) createWindow();
    console.log("\n"+((new Date()).toLocaleString()+"\n"));
    startServers();
    checkForUpdates();
    setInterval(() => checkForUpdates(), 1000*60*60*6) //Every 6 hours
})

app.on('window-all-closed', function () {
    if (config.background !== true) {
        removeTray();
        app.quit();
    } else {
        //Stay running even when all windows closed
        if (process.platform === "darwin") app.dock.hide();
    }
})

let isQuitting = false;

ipcMain.on('quit', quit)

ipcMain.on('saveconfig', function(event, arg1) {
    config = arg1.config;
    try {
        fs.writeFileSync(path.join(app.getPath('userData'), "config.json"), JSON.stringify(arg1.config, null, 2));
    } catch(e) {
        console.warn(e);
    }
    configChanged();

    if (update_info && update_info.version == config.ignore_update) {
        update_info.ignored = true;
    }

    if (arg1.reload && mainWindow) {
        // mainWindow.webContents.setUserAgent(mainWindow.webContents.getUserAgent().split(" language:")[0] + " language:" + getLanguage());
        mainWindow.reload();
    }
})

function configChanged() {
    if (config.updates === true && install_source !== "macappstore" && last_update_check_skipped === true) checkForUpdates();

    if (config.updates === false || install_source === "macappstore") {
        last_update_check_skipped = true;
    }

    if (config.tray) {
        createTray();
    } else {
        removeTray();
    }

    nativeTheme.themeSource = config.theme || "system";
    startServers();
}

ipcMain.handle('showPicker', async (event, arg) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        defaultPath: arg.current_path || undefined,
        properties: ['openDirectory', 'createDirectory'],
        securityScopedBookmarks: true
    });
    if (result.filePaths && result.filePaths.length > 0 && result.bookmarks && result.bookmarks.length > 0) {
        bookmarks.add(result.filePaths[0], result.bookmarks[0]); //Will only be called in mas build
    }
    return result.filePaths;
});

ipcMain.handle('showPickerForPlugin', async (event, arg) => {
    let result;
    if (arg.select_type === "folder") {
        result = await dialog.showOpenDialog(mainWindow, {
            defaultPath: undefined,
            properties: ['openDirectory', 'createDirectory']
        });
    } else if (arg.select_type === "zip") {
        result = await dialog.showOpenDialog(mainWindow, {
            defaultPath: undefined,
            filters: [ { name: "ZIP Files", extensions: ['zip'] } ],
            properties: ['openFile']
        });
    } else {
        result = await dialog.showOpenDialog(mainWindow, {
            defaultPath: undefined,
            filters: [ { name: "ZIP Files", extensions: ['zip'] } ],
            properties: ['openFile', 'openDirectory', 'createDirectory']
        });
    }
    return result.filePaths;
});

ipcMain.handle('generateCrypto', () => {
    return WSC.createCrypto();
});

ipcMain.handle('openExternal', (event, arg) => {
    shell.openExternal(arg.url);
});

app.on('activate', () => {
    if (!process.mas && !app.hasSingleInstanceLock()) return;
    if (mainWindow === null) {
        createWindow();
        if (process.platform === "darwin") app.dock.show();
    }
})

let lastIps = [];
setInterval(function() {
    const ips = getIPs();
    if (lastIps.length !== ips.length || JSON.stringify(lastIps.sort(function(a, b){
        if(a[0] < b[0]) return -1;
        if(a[0] > b[0]) return 1;
        return 0;
    })) !== JSON.stringify(ips.sort(function(a, b){
        if(a[0] < b[0]) return -1;
        if(a[0] > b[0]) return 1;
        return 0;
    }))) {
        lastIps = ips;
        if (mainWindow && mainWindow.webContentsLoaded) {
            mainWindow.webContents.send('message', {"type": "ipchange", ip: ips});
            console.log("["+(new Date()).toLocaleString()+"] IP(s) changed: "+JSON.stringify(ips));
        }
    }
}, 10000) //every 10 seconds

function getLanguage() {
    let language = "en";

    if (config.language && Object.keys(languages).indexOf(config.language) > -1) {
        language = config.language;
    } else {
        let system_langs = app.getPreferredSystemLanguages();
        for (let i = 0; i < system_langs.length; i++) {
            for (let e = 0; e < Object.keys(languages).length; e++) {
                if (system_langs[i].indexOf(Object.keys(languages)[e].split("_")[0]) == 0) {
                    language = Object.keys(languages)[e];
                    return language;
                }
            }
        }
    }

    return language;
}

function getLang() {
    if (getLanguage() !== "en") {
        let lang_target_src = JSON.parse(fs.readFileSync(path.join(__dirname, "lang/"+getLanguage().split("_")[0]+".json"), "utf-8"));   
        let lang_to_return = JSON.parse(fs.readFileSync(path.join(__dirname, "lang/en.json"), "utf-8"));
        
        for (var i = 0; i < Object.keys(lang_target_src).length; i++) {
            lang_to_return[Object.keys(lang_target_src)[i]] = lang_target_src[Object.keys(lang_target_src)[i]];
        }
        
        return lang_to_return;
    } else {
        return JSON.parse(fs.readFileSync(path.join(__dirname, "lang/en.json"), "utf-8"));
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        backgroundColor: nativeTheme.shouldUseDarkColors ? '#202020' : '#ffffff',
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
            enableRemoteModule: false,
            sandbox: true,
            preload: path.join(__dirname, "preload.js")
        }
    });
    mainWindow.setMenuBarVisibility(false);

    // mainWindow.webContents.setUserAgent(mainWindow.webContents.getUserAgent() + " language:" + getLanguage());

    mainWindow.loadFile('index.html');

    //mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContentsLoaded = true;
        lastIps = getIPs();
        mainWindow.webContents.send('message', {"type": "init", "language": getLanguage(), "languages": languages, "lang": getLang(), "config": config, ip: lastIps, install_source: install_source, plugins: plugin.getInstalledPlugins(), platform: process.platform, version: app.getVersion()});
        if (update_info) {
            mainWindow.webContents.send('message', {"type": "update", "url": update_info.url, "text": update_info.text, "attributes": update_info.attributes, "version": update_info.version, "ignored": update_info.ignored});
        }
        updateServerStates();
    });

    mainWindow.webContents.on('new-window', (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
    });

    mainWindow.on('close', e => {
        if (config.background && process.platform === "win32" && !isQuitting) {
            mainWindow.hide();
            e.preventDefault();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function updateServerStates() {
    if (mainWindow && mainWindow.webContentsLoaded) {
        const server_states = running_servers.map(function(a) {
            return {
                "config": a.config,
                "state": a.state,
                "error_message": a.error_message
            }
        });
        mainWindow.webContents.send('message', {"type": "state", "server_states": server_states});
    }
}

function createServer(serverconfig) {
    let found_already_running = false;
    for (let e=0; e<running_servers.length; e++) {
        if (configsEqual(running_servers[e].config, serverconfig)) {
            found_already_running = true;
        }
    }
    if (serverconfig.enabled && !found_already_running) {
        let this_server = {"config":serverconfig,"state":"starting","server":null};

        const hostname = serverconfig.localnetwork ? (serverconfig.ipv6 ? '::' : '0.0.0.0') : (serverconfig.ipv6 ? '::1' : '127.0.0.1');
        let server;
        try {
            if (serverconfig.https) {
                if (!serverconfig.httpsKey || !serverconfig.httpsCert) {
                    console.log('Creating temp crypto');
                    const crypto = WSC.createCrypto();
                    server = https.createServer({key: crypto.privateKey, cert: crypto.cert});
                } else {
                    server = https.createServer({key:  ('-----BEGIN RSA PRIVATE KEY-----'+serverconfig.httpsKey.split('-----BEGIN RSA PRIVATE KEY-----').pop().split('-----END RSA PRIVATE KEY-----')[0].replace(/ /g, '\r\n')+'-----END RSA PRIVATE KEY-----'), cert: ('-----BEGIN CERTIFICATE-----'+serverconfig.httpsCert.split('-----BEGIN CERTIFICATE-----').pop().split('-----END CERTIFICATE-----')[0].replace(/ /g, '\r\n')+'-----END CERTIFICATE-----')});
                }
            } else {
                server = http.createServer();
            }
        } catch(err) {
            console.error(err);
            this_server.state = "error";
            this_server.error_message = (serverconfig.https ? "There might be something wrong with your HTTPS certificate and key.\n" : "") + err.message;
            running_servers.push(this_server);
            return;
        }
        this_server.server = server;

        try {
            this_server.FileSystem = new WSC.FileSystem(serverconfig.path);
        } catch(e) {
            console.warn("Error setting up FileSystem for path "+serverconfig.path, e);
            this_server.state = "error";
            this_server.error_message = "FILESYSTEMERROR-" + e.message;
            running_servers.push(this_server);
            return;
        }
        if (serverconfig.plugins) {
            try {
                this_server.plugins = plugin.registerPlugins(this_server);
                this_server.plugins.functions.onStart(server, serverconfig.plugins);
            } catch(e) {
                console.warn('Error setting up plugins', e);
                this_server.state = "error";
                this_server.error_message = "PLUGINERROR-" + e.message;
                running_servers.push(this_server);
                return;
            }
        }

        server.on('request', (req, res) => {
            if (serverconfig.plugins) {
                let prevented = false;
                try {
                    this_server.plugins.functions.onRequest(req, res, ()=>{prevented = true}, serverconfig.plugins);
                } catch(e) {
                    console.log('Plugin error', e);
                    res.statusCode = 500;
                    res.end('Plugin error');
                    return;
                }
                if (prevented || !req.socket.writable) return;
            }
            WSC.onRequest(serverconfig, req, res, this_server.FileSystem);
        });
        server.on('clientError', (err, socket) => {
            if (err.code === 'ECONNRESET' || !socket.writable) return;
            socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
        });
        server.on('error', e => {
            console.error(e);
            this_server.state = "error";
            this_server.error_message = e.message;
            updateServerStates();
        });
        server.on('listening', () => {
            console.log("["+(new Date()).toLocaleString()+'] Listening on ' + (serverconfig.https ? 'https' : 'http') + '://' + hostname + ':' + serverconfig.port)
            this_server.state = "running";
            updateServerStates();
        });
        server.listen(serverconfig.port, hostname);
        let connections = {}
        server.on('connection', conn => {
            const k = conn.remoteAddress + ':' + conn.remotePort;
            connections[k] = conn;
            conn.on('close', () => {
                delete connections[k];
            });
        });
        server.destroy = function(cb) {
            server.close(cb);
            for (const k in connections) connections[k].destroy();
        };
        running_servers.push(this_server);
    }
}

let running_servers = [];

function createServers() {
    for (let i=0; i<(config.servers || []).length; i++) createServer(config.servers[i]);
    updateServerStates();
}

function startServers(force_restart_indexes) {
    if (running_servers.length == 0) {
        createServers();
        return;
    }
    let closed_servers = 0;
    let need_close_servers = running_servers.length;

    for (let i=0; i<running_servers.length; i++) {
        let found_matching_config = false;
        for (let e=0; e<(config.servers || []).length; e++) {
            if (configsEqual(config.servers[e], running_servers[i].config)) {
                found_matching_config = true;
            }
        }

        if (found_matching_config && (force_restart_indexes || []).indexOf(i) == -1) {
            need_close_servers--;
        } else {
            running_servers[i].deleted = true;
            console.log("["+(new Date()).toLocaleString()+'] Killing server on port ' + running_servers[i].config.port);
            if (running_servers[i].server && running_servers[i].server.destroy) {
                running_servers[i].server.destroy(() => {
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
        for (let i=running_servers.length-1; i>-1; i--) {
            if (running_servers[i].deleted) {
                running_servers.splice(i, 1);
            }
        }

        if (closed_servers === need_close_servers) createServers();
    }

    checkServersClosed()
}

function configsEqual(config1, config2) {
    if (JSON.stringify(Object.keys(config1).sort()) === JSON.stringify(Object.keys(config2).sort())) {
        for (let o=0; o<Object.keys(config1).length; o++) {
            if (JSON.stringify(config1[Object.keys(config1)[o]]) !== JSON.stringify(config2[Object.keys(config1)[o]])) return false;
        }
        return true;
    }
    return false;
}

function restartServersWithPlugins(pluginids) {
    var server_indexes = [];
    for (let i=0; i<running_servers.length; i++) {
        if (running_servers[i].plugins) {
            for (let e=0; e<pluginids.length; e++) {
                if (running_servers[i].plugins[pluginids[e]] && running_servers[i].plugins[pluginids[e]].enabled) {
                    server_indexes.push(i);
                    break;
                }
            }
        }
    }
    startServers(server_indexes);
}

let update_info;
let last_update_check_skipped = false;

function checkForUpdates() {
    if (config.updates !== true || install_source === "macappstore") {
        last_update_check_skipped = true;
        return;
    }
    last_update_check_skipped = false;

    const parts = app.getVersion().split('.').map(part => parseInt(part, 10));
    const major = parts[0] * 1000000;
    const minor = parts[1] * 1000;
    const patch = parts[2];
    let version = major + minor + patch;

    let req = global.https.request({
        hostname: 'simplewebserver.org',
        port: 443,
        path: '/versions/'+version+".json",
        method: 'GET'
    }, res => {
        if (res.statusCode !== 200) {
            console.log("["+(new Date()).toLocaleString()+"] Update check failed (status code "+res.statusCode+")");
            return;
        }

        res.on('data', function(data) {
            let version_update;
            try {
                version_update = JSON.parse(data);
            } catch (e) {
                console.log("["+(new Date()).toLocaleString()+"] Update check failed (invalid response)");
            }
            if (!version_update.update) return;
            if (version_update.download[install_source] !== (update_info || {}).url) {
                console.log("["+(new Date()).toLocaleString()+"] Update available: "+version_update.download[install_source]);
            }
            update_info = {
                "url": version_update.download[install_source],
                "text": version_update.banner_text,
                "attributes": JSON.parse(version_update.attributes || '[]'),
                "version": version_update.version,
                "ignored": (config.ignore_update == version_update.version)
            }
            if (mainWindow && mainWindow.webContentsLoaded) {
                mainWindow.webContents.send('message', {"type": "update", "url": update_info.url, "text": update_info.text, "attributes": update_info.attributes, "version": update_info.version, "ignored": update_info.ignored});
            }
        })
    })

    req.on('error', e => {
        console.log("["+(new Date()).toLocaleString()+"] Update check failed");
        console.log(e);
    })

    req.end();
}

ipcMain.handle('addPlugin', (event, arg) => {
    try {
        plugin.importPlugin(arg.path, function(id) {
            restartServersWithPlugins(id);
            if (mainWindow && mainWindow.webContentsLoaded) {
                mainWindow.webContents.send('message', {"type": "pluginschange", plugins: plugin.getInstalledPlugins()});
            }
            setTimeout(function() {
                if (reload_plugins_timeout && reload_plugin_ids.every(a => a == id)) {
                    clearTimeout(reload_plugins_timeout);
                    reload_plugins_timeout = undefined;
                    reload_plugin_ids = [];
                }
            }, 100);
        });
        return true;
    } catch(e) {
        return false;
    }
});

ipcMain.handle('checkPlugin', (event, arg) => {
    try {
        return plugin.getPluginManifestFromPath(arg.path);
    } catch(e) {
        console.error(e);
        return false;
    }
});

ipcMain.handle('removePlugin', (event, arg) => {
    plugin.removePlugin(arg.id);
    restartServersWithPlugins(arg.id);
    if (mainWindow && mainWindow.webContentsLoaded) {
        mainWindow.webContents.send('message', {"type": "pluginschange", plugins: plugin.getInstalledPlugins()});
    }
    setTimeout(function() {
        if (reload_plugins_timeout && reload_plugin_ids.every(a => a == arg.id)) {
            clearTimeout(reload_plugins_timeout);
            reload_plugins_timeout = undefined;
            reload_plugin_ids = [];
        }
    }, 100);
});

function createTray() {
    if (!global.tray && (process.platform == "darwin" || process.platform == "win32")) {
        global.tray = new Tray(path.join(__dirname, (process.platform == "darwin" ? "images/menuBarIconTemplate.png" : "images/icon.ico")))
        global.tray.setToolTip('Simple Web Server')
        global.tray.on('click', function(e){
            if (mainWindow === null) {
                createWindow();
                if (process.platform === "darwin") app.dock.show();
            } else mainWindow.show();
        })
    }
}

function removeTray() {
    if (global.tray) global.tray.destroy();
    global.tray = undefined;
}