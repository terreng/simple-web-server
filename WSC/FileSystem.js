
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
    if (typeof callback != 'function') callback=function(){};
    this.callback = callback;
}

getByPath.prototype = {
    getFile: function() {
        if (!this.path) {
            return null;
        }
        var path = this.path;
        this.hidden = function(path) {
            var a = path.split('/');
            for (var i=0; i<a.length; i++) {
                if ((/(^|\/)\.[^\/\.]/g).test(a[i])) { //RegExp from https://stackoverflow.com/questions/18973655/how-to-ignore-hidden-files-in-fs-readdir-result/37030655#37030655
                    return true;
                }
            }
            return false;
        }(path);
        var bm = bookmarks.matchAndAccess(path);
        try {
            var stats = fs.statSync(path);
        } catch(e) {
            console.warn('error stating file "'+path+'"', e);
            var error = e;
        }
        bookmarks.release(bm);
        if (error) {
            try {
                if (error.path && typeof error.path == 'string') {
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
                return err;
            } catch(e) {
                this.callback({error: error, isFile: false, isDirectory: false, name: 'error'});
                return {error: error, isFile: false, isDirectory: false, name: 'error'};
            }
        }
        this.size = stats.size;
        this.modificationTime = stats.mtime;
        this.isDirectory = stats.isDirectory();
        this.isFile = stats.isFile();
        if (this.isFile && global.hostOS === 'win32') {
            var folder = path;
            if (folder.endsWith('/')) {
                this.callback({error: 'Path Not Found'});
                this.callback = null;
                return {error: 'Path Not Found'};
            }
            this.name = folder.split('/').pop();
            var folder = WSC.utils.stripOffFile(folder);
            var bm = bookmarks.matchAndAccess(folder);
            try {
                var files = fs.readdirSync(folder, {encoding: 'utf-8'});
            } catch(e) {
                console.warn('error reading directory "'+folder+'"', e);
                this.callback({error: 'Path Not Found'});
                this.callback = null;
                bookmarks.release(bm);
                return {error: 'Path Not Found'};
            }
            bookmarks.release(bm);
            if (files.includes(this.name)) {
                this.callback(this);
                this.callback = null;
                return this;
            } else {
                this.callback({error: 'Path Not Found'});
                this.callback = null;
                return {error: 'Path Not Found'};
            }
        } else {
            this.callback(this);
            this.callback = null;
            return this;
        }
    },
    text: function(callback) {
        if (typeof callback != 'function') callback=function(){};
        if (! this.isFile) {
            callback({error: 'Cannot preform on directory'});
            return {error: 'Cannot preform on directory'};
        }
        var result = this.file().toString();
        callback(result);
        return result;
    },
    file: function(callback) {
        if (typeof callback != 'function') callback=function(){};
        if (!this.path) {
            callback(null);
            return null;
        }
        var path = this.path
        if (! this.isFile) {
            callback({error: 'Cannot preform on directory'});
            return {error: 'Cannot preform on directory'};
        }
        var bm = bookmarks.matchAndAccess(path);
        try {
            var data = fs.readFileSync(path);
        } catch(err) {
            bookmarks.release(bm);
            callback({error:err});
            return {error:err};
        }
        bookmarks.release(bm);
        callback(data);
        return data;
    },
    remove: function(callback) {
        if (typeof callback != 'function') callback=function(){};
        if (!this.path) {
            callback(null);
            return null;
        }
        var bm = bookmarks.matchAndAccess(this.path);
        if (this.isDirectory) {
            try {
                fs.rmdirSync(this.path, {recursive: false});
            } catch(e) {
                var err = e;
            }
            bookmarks.release(bm);
            if (err) {
                callback({error: err, success: false});
                return {error: err, success: false};
            } else {
                callback({error: false, success: true});
                return {error: false, success: true};
            }
        } else {
            try {
                fs.unlinkSync(this.path);
            } catch(err) {
                bookmarks.release(bm);
                callback({error: err, success: false});
                return {error: err, success: false};
            }
            bookmarks.release(bm);
            callback({error: false, success: true});
            return {error: false, success: true};
        }
    },
    getDirContents: function(callback) {
        if (typeof callback != 'function') callback=function(){};
        if (!this.path) {
            callback(null);
            return null;
        }
        if (this.isFile) {
            callback({error: 'Cannot preform on file'});
            return {error: 'Cannot preform on file'};
        }
        var path = this.path;
        var bm = bookmarks.matchAndAccess(path);
        try {
            var files = fs.readdirSync(path, {encoding: 'utf-8'});
        } catch(err) {
            bookmarks.release(bm);
            callback({error:err});
            return {error:err};
        }
        bookmarks.release(bm);
        var results = [];
        for (var i=0; i<files.length; i++) {
            var file = new getByPath(this.origpath + '/' + files[i], null, this.fs);
            file.name = files[i];
            results.push(file.getFile());
        }
        callback(results);
        return results;
    }
}


function FileSystem(mainPath) {
    var mainPath = mainPath.replace(/\/\//g, '/').replace(/\\/g, '/');
    if (mainPath.endsWith('/')) {
        var mainPath = mainPath.substring(0, mainPath.length - 1);
    }
    var bm = bookmarks.matchAndAccess(mainPath);
    try {
        var stats = fs.statSync(mainPath);
    } catch(e) {
        throw new Error('Error checking entry');
    }
    if (!stats.isDirectory()) {
        throw new Error('Entered path is not directory');
    }
    bookmarks.release(bm);
    this.mainPath = mainPath;
}

FileSystem.prototype = {
    getByPath: function(path, callback) {
        var path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        var entry = new getByPath(path, callback, this);
        return entry.getFile();
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
        var bm = bookmarks.matchAndAccess(folder);
        if (! fs.existsSync(folder)) {
            try {
                fs.mkdirSync(folder, {recursive: true});
            } catch(e) {}
        }
        bookmarks.release(bm);
        var bm = bookmarks.matchAndAccess(path);
        try {
            var stats = fs.statSync(path);
        } catch(e) {
            var error = e;
        }
        if (error && error.code === 'ENOENT') {
            try {
                fs.writeFileSync(path, data);
            } catch(err) {
                bookmarks.release(bm);
                callback({error: err, success: false});
                return;
            }
            bookmarks.release(bm);
            callback({error: false, success: true});
        } else if (!error && allowOverWrite) {
            try {
                fs.unlinkSync(path);
            } catch(err) {
                bookmarks.release(bm);
                callback({error: err, success: false});
                return;
            }
            try {
                fs.writeFileSync(path, data);
            } catch(err) {
                bookmarks.release(bm);
                callback({error: err, success: false});
                return;
            }
            bookmarks.release(bm);
            callback({error: false, success: true});
        } else {
            bookmarks.release(bm);
            callback({error: error, success: false});
        }
        
    },
    createWriteStream: function(path) {
        var path = WSC.utils.relativePath(path, '');
        this.origpath = path;
        var path = this.mainPath + path;
        var path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        var folder = WSC.utils.stripOffFile(path);
        var bm = bookmarks.matchAndAccess(folder);
        if (! fs.existsSync(folder)) {
            try {
                fs.mkdirSync(folder, {recursive: true});
            } catch(e) {
                bookmarks.release(bm);
                return {error: 'error creating folder'};
            }
        }
        bookmarks.release(bm);
        var bm = bookmarks.matchAndAccess(path);
        var stream = fs.createWriteStream(path);
        stream.on('close', function(e) {
            //console.log('close', path);
            bookmarks.release(bm);
        })
        return stream;
    },
    createReadStream: function(path, opts) {
        var path = WSC.utils.relativePath(path, '');
        this.origpath = path;
        var path = this.mainPath + path;
        var path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        var bm = bookmarks.matchAndAccess(path);
        var stream = fs.createReadStream(path, opts);
        stream.on('close', function(e) {
            //console.log('close', path);
            bookmarks.release(bm);
        })
        return stream;
    }
}

module.exports = FileSystem;
