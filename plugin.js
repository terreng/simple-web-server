const JSZip = require("jszip");

function registerPlugins(data) {
    let config = data.config.plugin;
    let functions = [];
    let manifest;
    for (const k in config) {
        //console.log(config[k], k);
        if (!config[k].enabled) continue;
        try {
            let path = global.path.join(eApp.getPath('userData'), "plugins", k);
            const fs = new WSC.FileSystem(path); //no point in catching it if we're just going to throw it again.
            manifest = JSON.parse(fs.getByPath('/plugin.json').text());
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
    if (!validatePluginManifest(manifest)) throw new Error('Not a valid plugin');
    return manifest;
}

function getZipFiles(zip) {
    let rv = [];
    for (const file in zip.files) rv.push(file);
    return rv;
}

async function copyFolderRecursiveSyncFromZip(zip, targetFolder) {
    console.log('copy', targetFolder);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);
    let files = getZipFiles(zip);
    for (let i=0; i<files.length; i++) {
        let fileName = path.join(targetFolder, files[i]);
        try {
            if (!fs.existsSync(path.dirname(fileName))) {
                fs.mkdirSync(path.dirname(fileName), {recursive:true});
            }
        } catch(e) {
            fs.mkdirSync(path.dirname(fileName), {recursive:true});
        }
        fs.writeFileSync(fileName, await zip.files[files[i]].async("nodebuffer"));
    }
}

function importPlugin(path) {
    if (!global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins"))) {
        global.fs.mkdirSync(global.path.join(eApp.getPath('userData'), "plugins"));
    }
    let fs;
    try {
        fs = new WSC.FileSystem(path);
        const manifest = JSON.parse(fs.getByPath('/plugin.json').text());
        if (!validatePluginManifest(manifest)) throw new Error('not a valid plugin');
        if (global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", manifest.id))) {
            deleteFolder(global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
        }
        copyFolderRecursiveSync(path, global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
    } catch(e) {
        const bm = bookmarks.matchAndAccess(path);
        JSZip.loadAsync(global.fs.readFileSync(path)).then(async zip => {
            const manifest = JSON.parse(await zip.file('plugin.json').async("string"));
            if (!validatePluginManifest(manifest)) throw new Error('not a valid plugin');
            if (global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", manifest.id))) {
                deleteFolder(global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
            }
            copyFolderRecursiveSyncFromZip(zip, global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
            bookmarks.release(bm);
        });
    }
}

function getPluginManifestFromPath(path) {
    let fs;
    try {
        fs = new WSC.FileSystem(path);
        const manifest = JSON.parse(fs.getByPath('/plugin.json').text());
        if (!validatePluginManifest(manifest)) throw new Error('not a valid plugin');
        return manifest;
    } catch(e) {
        const bm = bookmarks.matchAndAccess(path);
        JSZip.loadAsync(global.fs.readFileSync(path)).then(async zip => {
            const manifest = JSON.parse(await zip.file('plugin.json').async("string"));
            if (!validatePluginManifest(manifest)) throw new Error('not a valid plugin');
            bookmarks.release(bm);
            return manifest;
        });
    }
}

function validatePluginManifest(manifest) {
    if (manifest.id && manifest.id.match(/^[A-Za-z0-9\-_]+$/) && manifest.script && manifest.name) {
        return true;
    } else {
        return false;
    }
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

module.exports = {registerPlugins, importPlugin, getPluginManifestFromPath, removePlugin, getInstalledPlugins, activate, deActivate};
