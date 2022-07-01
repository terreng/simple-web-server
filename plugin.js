
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
        var bm = bookmarks.matchAndAccess(path+manifest.script);
        try {
            functions.push([require(path+manifest.script), manifest.id]);
        } catch(e) {
            bookmarks.release(bm);
            throw e;
        }
        bookmarks.release(bm);
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
    var bm = bookmarks.matchAndAccess(target);
    if (fs.existsSync(target)) {
        if (fs.lstatSync(target).isDirectory()) {
            targetFile = path.join(target, path.basename(source));
        }
    }
    bookmarks.release(bm);
    var bm = bookmarks.matchAndAccess(targetFile);
    var bm2 = bookmarks.matchAndAccess(source);
    fs.writeFileSync(targetFile, fs.readFileSync(source));
    bookmarks.release(bm);
    bookmarks.release(bm2);
}

function copyFolderRecursiveSync(source, targetFolder) {
    //console.log('copy', source, targetFolder);
    var files = [];
    var bm = bookmarks.matchAndAccess(targetFolder);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder);
    bookmarks.release(bm);
    var bm = bookmarks.matchAndAccess(targetFolder);
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        bookmarks.release(bm);
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
        return;
    }
    bookmarks.release(bm);
}

function deleteFolder(folder) {
    var bm = bookmarks.matchAndAccess(folder);
    if (fs.lstatSync(folder).isDirectory()) {
        var files = fs.readdirSync(folder);
        bookmarks.release(bm);
        for (var i=0; i<files.length; i++) {
            var curSource = path.join(folder, files[i]);
            var bm = bookmarks.matchAndAccess(curSource);
            if (fs.lstatSync(curSource).isDirectory()) {
                deleteFolder(curSource);
            }
            fs.unlinkSync(curSource);
            bookmarks.release(bm);
        }
        return;
    }
    bookmarks.release(bm);
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
    var bm = bookmarks.matchAndAccess(global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
    if (global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", manifest.id))) {
        deleteFolder(global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
    }
    bookmarks.release(bm);
    var bm = bookmarks.matchAndAccess(global.path.join(eApp.getPath('userData'), "plugins"));
    if (!global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins"))) {
        global.fs.mkdirSync(global.path.join(eApp.getPath('userData'), "plugins"));
    }
    bookmarks.release(bm);
    copyFolderRecursiveSync(path, global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
    if (!inListAlready) config.push({id:manifest.id, config:[]});
    return config;
}

function removePlugin(id, config) {
    if (fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins", id))) {
        deleteFolder(path.join(eApp.getPath('userData'), "plugins", id));
    }
    for (var i=0; i<config.length; i++) {
        if (config[i].id === id) {
            config.splice(i, 1);
            break;
        }
    }
    return config;
}

module.exports = {registerPlugins, importPlugin, removePlugin};
