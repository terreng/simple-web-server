
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
        functions.push(require(path+manifest.script));
        // note - server will need to restart to load changes in plugin
        
    }
    
	return {
        fs,
        manifest,
        functions: {
            onStart: function(s) {
                for (var i=0; i<functions.length; i++) {
                    if (typeof functions[i].onStart == 'function') {
                        functions[i].onStart(s);
                    }
                }
            },
            onRequest: function(a, b, c) {
                var e = false;
                var d = function() {e=true;}
                for (var i=0; i<functions.length; i++) {
                    if (typeof functions[i].onRequest == 'function') {
                        functions[i].onRequest(a, b, d);
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
    fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source, targetFolder) {
    //console.log('copy', source, targetFolder);
    var files = [];
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            var curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, targetFolder);
            } else {
                copyFileSync(curSource, targetFolder);
            }
        } );
    }
}

function importPlugin(path, config) {
    var fs = new WSC.FileSystem(path); //easiest way to verify entered directory is a directory
    var manifest = JSON.parse(fs.getByPath('/manifest.json').text());
    if (!manifest.id||!manifest.script||!manifest.name) throw new Error('not a valid plugin');
    if (!config) config = [];
    for (var i=0; i<config.length; i++) {
        if (config[i].id === manifest.id) {
            //fs.rmSync(path_to_delete, {recursive: true}) //not sure how this will do with the apple bookmark things
            console.log("exists - need to delete");
            return;
            break;
        }
    }
    if (!global.fs.existsSync(global.path.join(eApp.getPath('userData'), "plugins"))) {
        global.fs.mkdirSync(global.path.join(eApp.getPath('userData'), "plugins"));
    }
    copyFolderRecursiveSync(path, global.path.join(eApp.getPath('userData'), "plugins", manifest.id));
    config.push({id:manifest.id, config:[]});
    return config;
}

module.exports = {registerPlugins, importPlugin};
