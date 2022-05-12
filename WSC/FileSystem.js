
function getByPath(path, callback, FileSystem) {
    if (!path) {
        if (typeof path == 'string') {
            path = '/';
        } else {
            return null;
        }
    }
    this.fs = FileSystem;
    if (! (path.startsWith('/') || path.startsWith('\\'))) {
        var path = '/' + path;
    }
    this.origpath = path.replace(/\/\//g, '/');
    this.fullPath = this.origpath;
    this.path = this.fs.mainPath + WSC.utils.relativePath(path, '').replace(/\/\//g, '/');
    this.callback = callback;
}

getByPath.prototype = {
    getFile: function() {
        if (!this.path) {
            return null;
        }
        var path = this.path
        this.hidden = function(path) {
            var a = path.split('/');
            for (var i=0; i<a.length; i++) {
                if ((/(^|\/)\.[^\/\.]/g).test(a[i])) { //RegExp from https://stackoverflow.com/questions/18973655/how-to-ignore-hidden-files-in-fs-readdir-result/37030655#37030655
                    return true;
                }
            }
            return false;
        }(path);
        try {
            var stats = fs.statSync(path);
        } catch(e) {
            var error = e;
        }
        if (error) {
            try {
                if (error.path && typeof error.path == 'string' && error.code === 'EPERM') {
                    var err = {};
                    err.path = error.path.replace(/\\/g, '/').replace(/\/\//g, '/');
                    if (error.path.endsWith('/')) {
                        var split = err.path.split('/');
                        err.name = split[split.length-1];
                    } else {
                        err.name = err.path.split('/').pop();
                    }
                    err.isDirectory = false;
                    err.isFile = false;
                    err.error = error;
                }
                var err = err || {error: error, isFile: false, isDirectory: false, name: 'error'};
                this.callback(err);
            } catch(e) {
                this.callback({error: error, isFile: false, isDirectory: false, name: 'error'});
            }
            return;
        }
        this.size = stats.size;
        this.modificationTime = stats.mtime;
        this.isDirectory = stats.isDirectory();
        this.isFile = stats.isFile();
        if (this.isFile) {
            var folder = path;
            if (folder.endsWith('/')) {
                this.callback({error: 'Path Not Found'});
                this.callback = null;
                return;
            }
            this.name = folder.split('/').pop();
            var folder = WSC.utils.stripOffFile(folder);
            try {
                var files = fs.readdirSync(folder, {encoding: 'utf-8'});
            } catch(e) {
                this.callback({error: 'Path Not Found'});
                this.callback = null;
                return;
            }
            if (files.includes(this.name)) {
                this.callback(this);
                this.callback = null;
            } else {
                this.callback({error: 'Path Not Found'});
                this.callback = null;
            }
        } else {
            this.callback(this);
            this.callback = null;
        }
    },
    text: function(callback) {
        if (! callback) {
            return;
        }
        if (! this.isFile) {
            callback({error: 'Cannot preform on directory'});
            return;
        }
        this.file(function(file) {
            callback(file.toString());
        })
    },
    textPromise: function() {
        return new Promise(function(resolve, reject) {
            this.text(resolve);
        }.bind(this));
    },
    file: function(callback) {
        if (!this.path) {
            callback(null);
            return null;
        }
        if (! callback) {
            return;
        }
        var path = this.path
        if (! this.isFile) {
            callback({error: 'Cannot preform on directory'});
            return;
        }
        try {
            var data = fs.readFileSync(path);
        } catch(e) {
            callback({error:err});
            return;
        }
        callback(data);
    },
    filePromise: function() {
        return new Promise(function(resolve, reject) {
            this.file(resolve);
        }.bind(this))
    },
    remove: function(callback) {
        if (!this.path) {
            callback(null);
            return null;
        }
        if (! callback) {
            callback = function() {};
        }
        if (this.isDirectory) {
            try {
                fs.rmdirSync(this.path, {recursive: false});
            } catch(e) {
                var err = e;
            }
            if (err) {
                callback({error: err, success: false});
            } else {
                callback({error: false, success: true});
            }
        } else {
            try {
                fs.unlinkSync(this.path);
            } catch(e) {
                callback({error: err, success: false})
                return;
            }
            callback({error: false, success: true})
        }
    },
    removePromise: function() {
        return new Promise(function(resolve, reject) {
            this.remove(resolve);
        }.bind(this))
    },
    getDirContents: function(callback) {
        if (! callback) {
            return;
        }
        if (!this.path) {
            callback(null);
            return null;
        }
        if (this.isFile) {
            callback({error: 'Cannot preform on file'});
            return;
        }
        var path = this.path
        try {
            var files = fs.readdirSync(path, {encoding: 'utf-8'});
        } catch(e) {
            callback({error:err});
            return;
        }
        var results = [];
        var i = 0;
        var totalLength = files.length - 1;
        function finished() {
            callback(results);
        }
        function getFileInfo() {
            var file = new getByPath(this.origpath + '/' + files[i], function(file) {
                results.push(file);
                if (i < totalLength) {
                    i++;
                    getFileInfo.bind(this)();
                } else {
                    finished.bind(this)();
                }
            }.bind(this), this.fs);
            file.name = files[i];
            file.getFile();
        }
        if (files.length > 0) {
            getFileInfo.bind(this)();
        } else {
            finished.bind(this)();
        }
    },
    getDirContentsPromise: function() {
        return new Promise(function(resolve, reject) {
            this.getDirContents(resolve);
        }.bind(this))
    }
}


function FileSystem(mainPath) {
    var mainPath = mainPath.replace(/\/\//g, '/').replace(/\\/g, '/');
    if (mainPath.endsWith('/')) {
        var mainPath = mainPath.substring(0, mainPath.length - 1);
    }
    this.mainPath = mainPath;
}

FileSystem.prototype = {
    getByPath: function(path, callback) {
        var path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        var entry = new getByPath(path, callback, this);
        entry.getFile();
    },
    asyncGetByPath: function(path) {
        return new Promise(function(resolve, reject) {
            this.getByPath(path, resolve);
        }.bind(this))
    },
    writeFile: function(path, data, callback, allowOverWrite) {
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        var path = WSC.utils.relativePath(path, '');
        var origpath = path;
        var path = this.mainPath + path;
        var path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        var folder = WSC.utils.stripOffFile(path);
        if (! fs.existsSync(folder)) {
            try {
                fs.mkdirSync(folder, {recursive: true});
            } catch(e) {}
        }
        try {
            var stats = fs.statSync(path);
        } catch(e) {
            var error = e;
        }
        if (error && error.code === 'ENOENT') {
            try {
                fs.writeFileSync(path, data);
            } catch(e) {
                callback({error: err, success: false});
                return;
            }
            callback({error: false, success: true});
        } else if (!error && allowOverWrite) {
            try {
                fs.unlinkSync(path);
            } catch(e) {
                callback({error: err, success: false});
                return;
            }
            try {
                fs.writeFileSync(path, data);
            } catch(e) {
                callback({error: err, success: false});
                return;
            }
            callback({error: false, success: true});
        } else {
            callback({error: error, success: false});
        }
        
    },
    createWriteStream: function(path) {
        var path = WSC.utils.relativePath(path, '');
        this.origpath = path;
        var path = this.mainPath + path;
        var path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        var folder = WSC.utils.stripOffFile(path);
        if (! fs.existsSync(folder)) {
            try {
                fs.mkdirSync(folder, {recursive: true});
            } catch(e) {
                return {error: 'error creating folder'};
            }
        }
        return fs.createWriteStream(path);
    },
    createReadStream: function(path, opts) {
        var path = WSC.utils.relativePath(path, '');
        this.origpath = path;
        var path = this.mainPath + path;
        var path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        return fs.createReadStream(path, opts);
    }
}

module.exports = FileSystem;
