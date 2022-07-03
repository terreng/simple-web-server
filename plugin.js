
function registerPlugins(data) {
	var config = data.config.plugin;
    var functions = [];
    for (var i=0; i<config.length; i++) {
        var path = global.path.join(eApp.getPath('userData'), "plugins", config[i].id);
        var fs = new WSC.FileSystem(path); //no point in catching it if we're just going to throw it again.
        var manifest = JSON.parse(fs.getByPath('/manifest.json').text());
        //addOptionsToUI(manifest.options, manifest.id);
        if (!path.endsWith('/')) path+='/';
        //console.log(path+manifest.script)
        functions.push([require(path+manifest.script), manifest.id]);
        // note - server will need to restart to load changes in plugin
        
    }
    
	return {
        fs,
        manifest,
        functions: {
            onStart: function(s, settings) {
                for (var i=0; i<functions.length; i++) {
                    if (typeof functions[i][0].onStart == 'function') {
                        var set;
                        for (var i=0; i<settings.length; i++) {
                            if (settings[i].id === functions[i][1]) {
                                set = settings[i].config;
                                break;
                            }
                        }
                        functions[i][0].onStart(s, set);
                    }
                }
            },
            onRequest: function(a, b, c, settings) {
                var e = false;
                var d = function() {e=true;}
                for (var i=0; i<functions.length; i++) {
                    if (typeof functions[i][0].onRequest == 'function') {
                        var set;
                        for (var i=0; i<settings.length; i++) {
                            if (settings[i].id === functions[i][1]) {
                                set = settings[i].config;
                                break;
                            }
                        }
                        functions[i][0].onRequest(a, b, set, d);
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
    }
}

function importPlugin(path, config) {
    var fs = new WSC.FileSystem(path); //easiest way to verify entered directory is a directory
    var manifest = JSON.parse(fs.getByPath('/manifest.json').text());
    if (!manifest.id||!manifest.script||!manifest.name) throw new Error('not a valid plugin');
    if (!config) config = [];
    var inListAlready = false;
    for (var i=0; i<config.length; i++) {
        if (config[i].id === manifest.id) {
            inListAlready = true;
            break;
        }
    }
    if (global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", manifest.id))) {
        deleteFolder(global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
    }
    if (!global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins"))) {
        global.fs.mkdirSync(global.path.join(eApp.getPath('userData'), "plugins"));
    }
    copyFolderRecursiveSync(path, global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
    if (!inListAlready) config.push({id:manifest.id, config:[]});
    return config;
}

function removePlugin(id, serverConfig, config) {
    for (var i=0; i<config.length; i++) {
        if (config[i].id === id) {
            config.splice(i, 1);
            break;
        }
    }
    var usedOtherPlaces = false;
    for (var j=0; j<serverConfig.plugin.length; j++) {
        for (var i=0; i<serverConfig.plugin[j].length; i++) {
            if (serverConfig.plugin[j][i].id === id) {
                usedOtherPlaces = true;
                break;
            }
        }
    }
    if (!usedOtherPlaces && fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", id))) {
        deleteFolder(path.join(eApp.getPath('userData'), "plugins", id));
    }
    return config;
}

module.exports = {registerPlugins, importPlugin, removePlugin};
