const JSZip = require("jszip");

function registerPlugins(data) {
    let functions = [];
    let manifest;
    for (const k in data.config.plugins) {
        //console.log(config[k], k);
        if (!data.config.plugins[k].enabled) continue;
        try {
            let path = global.path.join(eApp.getPath('userData'), "plugins", k);
            const fs = new WSC.FileSystem(path); //no point in catching it if we're just going to throw it again.
            manifest = JSON.parse(fs.getByPath('/plugin.json').text());
            if (!path.endsWith('/')) path+='/';
            //console.log(path+manifest.script)
            if (validatePluginManifest(manifest) && manifest.id == k) {
                functions.push([require(path+manifest.script), manifest.id]);
            }
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
                    functions[i][0].onStart(s, settings[functions[i][1]] || {});
                }
            },
            onRequest: function(req, res, pv, settings) {
                let prevented = false;
                let prvt = ()=>{prevented=true;}
                for (let i=0; i<functions.length; i++) {
                    if (typeof functions[i][0].onRequest !== 'function') continue;
                    functions[i][0].onRequest(req, res, settings[functions[i][1]] || {}, prvt);
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
        try {
            fs.unlinkSync(curSource);
        } catch(e) {}
    }
    fs.rmdirSync(folder);
}

function getPluginInfo(id) {
    let path = global.path.join(eApp.getPath('userData'), "plugins", id);
    let fs = new WSC.FileSystem(path);
    let manifest = JSON.parse(fs.getByPath('/plugin.json').text());
    if (!(validatePluginManifest(manifest) && manifest.id == id)) throw new Error('Not a valid plugin');
    return manifest;
}

function getZipFiles(zip, basePath) {
    let rv = [];
    for (const file in zip.files) {
        if (basePath !== '') {
            if (!file.startsWith(basePath)) continue
        }
        rv.push(file);
    }
    return rv;
}

async function copyFolderRecursiveSyncFromZip(zip, targetFolder, basePath) {
    console.log('copy', targetFolder);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);
    let files = getZipFiles(zip, basePath);
    for (let i=0; i<files.length; i++) {
        let name = files[i];
        if (basePath !== '') {
            name = name.replace(basePath, '');
        }
        if (name === '') continue;
        let fileName = path.join(targetFolder, name);
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

function importPlugin(path, callback) {
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
        callback(manifest.id);
    } catch(e) {
        const bm = bookmarks.matchAndAccess(path);
        JSZip.loadAsync(global.fs.readFileSync(path)).then(async zip => {
            let file = Object.keys(zip.files).filter(fileName => fileName.endsWith('plugin.json')&&!fileName.endsWith('.plugin.json'))[0];
            const manifest = JSON.parse(await zip.files[file].async("string"));
            if (!validatePluginManifest(manifest)) {
                bookmarks.release(bm);
                throw new Error('not a valid plugin');
            }
            if (global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", manifest.id))) {
                deleteFolder(global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
            }
            let basePath = file.includes('/') ? file.substring(0, file.length-file.split('/').pop().length) : '';
            await copyFolderRecursiveSyncFromZip(zip, global.path.join(eApp.getPath('userData'), "plugins", manifest.id), basePath);
            bookmarks.release(bm);
            callback(manifest.id);
        });
    }
}

async function getPluginManifestFromPath(path) {
    let fs;
    try {
        fs = new WSC.FileSystem(path);
        const manifest = JSON.parse(fs.getByPath('/plugin.json').text());
        if (!validatePluginManifest(manifest)) throw new Error('not a valid plugin');
        return manifest;
    } catch(e) {
        const bm = bookmarks.matchAndAccess(path);
        const zip = await JSZip.loadAsync(global.fs.readFileSync(path))
        let file = Object.keys(zip.files).filter(fileName => fileName.endsWith('plugin.json')&&!fileName.endsWith('.plugin.json'))[0];
        const manifest = JSON.parse(await zip.files[file].async("string"));
        bookmarks.release(bm);
        if (!validatePluginManifest(manifest)) throw new Error('not a valid plugin');
        return manifest;
    }
}

function validatePluginManifest(manifest) {
    if (manifest && typeof manifest == "object" && typeof manifest.id == "string" && manifest.id.match(/^[A-Za-z0-9\-_]+$/) && typeof manifest.script == "string" && typeof manifest.name == "string" && manifest.name.length <= 64) {
        if (typeof manifest.options == "object") {
            if (Array.isArray(manifest.options)) {

                function validateOption(option) {
                    if (option && typeof option == "object" && typeof option.id == "string" && option.id.match(/^[A-Za-z0-9\-_]+$/) && option.id !== "enabled" && typeof option.name == "string" && option.name.length <= 512 && (typeof option.description == "undefined" || typeof option.description == "string")) {
                        if (option.type == "bool") {
                            return typeof option.default == "boolean";
                        } else if (option.type == "string") {
                            return typeof option.default == "string";
                        } else if (option.type == "number") {
                            return typeof option.default == "number" && (typeof option.min == "number" || typeof option.min == "undefined") && (typeof option.max == "number" || typeof option.max == "undefined");
                        } else if (option.type == "select") {

                            if (typeof option.choices == "object" && Array.isArray(option.choices) && option.choices.length > 0) {

                                function validateChoice(choice) {
                                    return choice && typeof choice == "object" && typeof choice.id == "string" && choice.id.match(/^[A-Za-z0-9\-_]+$/) && typeof choice.name == "string" && choice.name.length <= 512;
                                }

                                return option.choices.every(validateChoice) && typeof option.default == "string" && option.choices.map(a => a.id).indexOf(option.default) > -1 && option.choices.map(a => a.id).filter((item, i, ar) => ar.indexOf(item) === i).length == option.choices.length;

                            } else {
                                return false;
                            }

                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }

                return manifest.options.every(validateOption) && manifest.options.map(a => a.id).filter((item, i, ar) => ar.indexOf(item) === i).length == manifest.options.length;

            } else {
                return false;
            }
        } else {
            return true;
        }
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

module.exports = {registerPlugins, importPlugin, getPluginManifestFromPath, removePlugin, getInstalledPlugins};
