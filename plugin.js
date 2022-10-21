function registerPlugins(data) {
    let config = data.config.plugin;
    let functions = [];
    for (const k in config) {
        //console.log(config[k], k);
        if (!config[k].enabled) continue;
        try {
            const path = global.path.join(eApp.getPath('userData'), "plugins", k);
            const fs = new WSC.FileSystem(path); //no point in catching it if we're just going to throw it again.
            const manifest = JSON.parse(fs.getByPath('/plugin.json').text());
            //addOptionsToUI(manifest.options, manifest.id);
            if (!path.endsWith('/')) path+='/';
            //console.log(path+manifest.script)
            functions.push([require(path+manifest.script), manifest.id]);
            // note - server will need to restart to load changes in plugin
        } catch(e) {
            console.warn('error registering plugin', e);
        }
    }

    return {
        fs,
        manifest,
        functions: {
            onStart: function(s, settings) {
                for (let i=0; i<functions.length; i++) {
                    if (typeof functions[i][0].onStart !== 'function') continue;
                    functions[i][0].onStart(s, settings[functions[i][1]]);
                }
            },
            onRequest: function(req, res, pv, settings) {
                let prevented = false;
                let prvt = ()=>{prevented=true;}
                for (let i=0; i<functions.length; i++) {
                    if (typeof functions[i][0].onRequest !== 'function') continue;
                    functions[i][0].onRequest(req, res, settings[functions[i][1]], prvt);
                    if (prevented) pv();
                }
            }
        }
    };
}
//https://stackoverflow.com/questions/13786160/copy-folder-recursively-in-node-js
function copyFileSync(source, target) {
    let targetFile = target;
    // If target is a directory, a new file with the same name will be created
    if (fs.existsSync(target)) {
        if (fs.lstatSync(target).isDirectory()) {
            targetFile = path.join(target, path.basename(source));
        }
    }
    const bm = bookmarks.matchAndAccess(source);
    fs.writeFileSync(targetFile, fs.readFileSync(source));
    bookmarks.release(bm);
}

function copyFolderRecursiveSync(source, targetFolder) {
    //console.log('copy', source, targetFolder);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);
    if (!fs.lstatSync(source).isDirectory()) return;
    let files = fs.readdirSync(source);
    for (let i=0; i<files.length; i++) {
        let curSource = path.join(source, files[i]);
        const bm = bookmarks.matchAndAccess(curSource);
        if (fs.lstatSync(curSource).isDirectory()) {
            copyFolderRecursiveSync(curSource, targetFolder);
        } else {
            copyFileSync(curSource, targetFolder);
        }
        bookmarks.release(bm);
    }
}

function deleteFolder(folder) {
    if (!fs.lstatSync(folder).isDirectory()) return;
    let files = fs.readdirSync(folder);
    for (let i=0; i<files.length; i++) {
        let curSource = path.join(folder, files[i]);
        if (fs.lstatSync(curSource).isDirectory()) deleteFolder(curSource);
        fs.unlinkSync(curSource);
    }
    fs.rmdirSync(folder);
}

function getPluginInfo(id) {
    let path = global.path.join(eApp.getPath('userData'), "plugins", id);
    let fs = new WSC.FileSystem(path);
    let manifest = JSON.parse(fs.getByPath('/plugin.json').text());
    if (!manifest.id||!manifest.script||!manifest.name) throw new Error('Not a valid plugin');
    return manifest;
}

function importPlugin(path) {
    const fs = new WSC.FileSystem(path); //easiest way to verify entered directory is a directory
    const manifest = JSON.parse(fs.getByPath('/plugin.json').text());
    if (!manifest.id||!manifest.script||!manifest.name) throw new Error('not a valid plugin');
    if (!global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins"))) {
        global.fs.mkdirSync(global.path.join(eApp.getPath('userData'), "plugins"));
    }
    if (global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", manifest.id))) {
        deleteFolder(global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
    }
    copyFolderRecursiveSync(path, global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
}

function removePlugin(id) {
    if (!fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", id))) return;
    deleteFolder(path.join(eApp.getPath('userData'), "plugins", id));
}

function getInstalledPlugins() {
    let data = {};
    let files = [];
    try {
        files = fs.readdirSync(global.path.join(eApp.getPath('userData'), "plugins"), {encoding: 'utf-8'});
    } catch(e) {
        console.warn(e);
        return data;
    }
    for (let i=0; i<files.length; i++) {
        try {
            data[files[i]] = getPluginInfo(files[i]);
        } catch(e) {
            console.warn('could not import plugin '+files[i], e);
            continue;
        };
    }
    return data;
}

function activate(id, config) {
    if (config[id]) {
        config[id].enabled = true;
    } else {
        config[id] = {enabled:true};
    }
    return config;
}

function deActivate(id, config) {
    if (config[id]) {
        config[id].enabled = false;
    } else {
        config[id] = {enabled:false};
    }
    return config;
}

module.exports = {registerPlugins, importPlugin, removePlugin, getInstalledPlugins, activate, deActivate};
