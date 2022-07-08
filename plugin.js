
function registerPlugins(data) {
	var config = data.config.plugin;
    var functions = [];
    for (var k in config) {
        console.log(config[k], k);
        if (!config[k].enabled) continue;
        try {
            var path = global.path.join(eApp.getPath('userData'), "plugins", k);
            var fs = new WSC.FileSystem(path); //no point in catching it if we're just going to throw it again.
            var manifest = JSON.parse(fs.getByPath('/manifest.json').text());
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
                for (var i=0; i<functions.length; i++) {
                    if (typeof functions[i][0].onStart == 'function') {
                        functions[i][0].onStart(s, settings[functions[i][1]]);
                    }
                }
            },
            onRequest: function(a, b, c, settings) {
                var e = false;
                var d = function() {e=true;}
                for (var i=0; i<functions.length; i++) {
                    if (typeof functions[i][0].onRequest == 'function') {
                        functions[i][0].onRequest(a, b, settings[functions[i][1]], d);
                        if (e) {
                            c();
                            break;
                        }
                    }
                }
            }
        }
    };
}
//https://stackoverflow.com/questions/13786160/copy-folder-recursively-in-node-js
function copyFileSync(source, target) {
    var targetFile = target;
    // If target is a directory, a new file with the same name will be created
    if (fs.existsSync(target)) {
        if (fs.lstatSync(target).isDirectory()) {
            targetFile = path.join(target, path.basename(source));
        }
    }
    var bm = bookmarks.matchAndAccess(source);
    fs.writeFileSync(targetFile, fs.readFileSync(source));
    bookmarks.release(bm);
}

function copyFolderRecursiveSync(source, targetFolder) {
    //console.log('copy', source, targetFolder);
    var files = [];
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        for (var i=0; i<files.length; i++) {
            var curSource = path.join(source, files[i]);
            var bm = bookmarks.matchAndAccess(curSource);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, targetFolder);
            } else {
                copyFileSync(curSource, targetFolder);
            }
            bookmarks.release(bm);
        }
    }
}

function deleteFolder(folder) {
    if (fs.lstatSync(folder).isDirectory()) {
        var files = fs.readdirSync(folder);
        for (var i=0; i<files.length; i++) {
            var curSource = path.join(folder, files[i]);
            if (fs.lstatSync(curSource).isDirectory()) {
                deleteFolder(curSource);
            }
            fs.unlinkSync(curSource);
        }
        fs.rmdirSync(folder);
    }
}

function getPluginInfo(id) {
    var path = global.path.join(eApp.getPath('userData'), "plugins", id);
    var fs = new WSC.FileSystem(path);
    var manifest = JSON.parse(fs.getByPath('/manifest.json').text());
    if (!manifest.id||!manifest.script||!manifest.name) throw new Error('not a valid plugin');
    return manifest;
}

function importPlugin(path) {
    var fs = new WSC.FileSystem(path); //easiest way to verify entered directory is a directory
    var manifest = JSON.parse(fs.getByPath('/manifest.json').text());
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
    if (fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", id))) {
        deleteFolder(path.join(eApp.getPath('userData'), "plugins", id));
    }
}

function getInstalledPlugins() {
    var data = {};
    var files;
    try {
        files = fs.readdirSync(global.path.join(eApp.getPath('userData'), "plugins"), {encoding: 'utf-8'});
    } catch(e) {
        console.warn(e);
        return data;
    }
    for (var i=0; i<files.length; i++) {
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
    }
    return config;
}

module.exports = {registerPlugins, importPlugin, removePlugin, getInstalledPlugins, activate, deActivate};
