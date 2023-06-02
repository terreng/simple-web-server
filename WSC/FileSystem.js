// When reading a directory, cache the directory contents.
// This is a performance thing.
let lastDirReadCache = null;

class getByPath {
    fs;
    origpath;
    fullPath;
    path;
    callback;
    hidden;
    size;
    modificationTime;
    isDirectory;
    isFile;
    constructor(path, callback, FileSystem) {
        if (!path && typeof path === 'string') {
            path = '/';
        }
        if (typeof path !== 'string') {
            throw new Error('Path must be a string');
        }
        this.fs = FileSystem;
        if (!(path.startsWith('/') || path.startsWith('\\'))) {
            path = '/' + path;
        }
        this.origpath = path.replace(/\/\//g, '/');
        this.fullPath = this.origpath;
        this.path = this.fs.mainPath + WSC.utils.relativePath('', path).replace(/\/\//g, '/');
        if (typeof callback !== 'function') callback=function(){};
        this.callback = callback;
    }
    getFile() {
        if (!this.path) return null;
        const path = this.path;
        this.hidden = WSC.utils.isHidden(path);
        let bm = bookmarks.matchAndAccess(path);
        let error, stats;
        try {
            stats = fs.statSync(path);
        } catch(e) {
            console.warn('Error stating "'+path+'"', e);
            error = e;
        }
        bookmarks.release(bm);
        bm = null;
        if (error) {
            let err = null;
            if (typeof error.path === 'string') {
                try {
                    err = {};
                    err.path = error.path.replace(/\\/g, '/').replace(/\/\//g, '/');
                    if (error.path.endsWith('/')) {
                        let split = err.path.split('/');
                        err.name = split[split.length-1];
                    } else {
                        err.name = err.path.split('/').pop();
                    }
                    err.isDirectory = false;
                    err.isFile = false;
                    err.error = error;
                } catch(e) {
                    err = null;
                }
            }
            err = err || {error: error, isFile: false, isDirectory: false, name: 'error'};
            this.callback(err);
            return err;
        }
        this.size = stats.size;
        this.modificationTime = stats.mtime;
        this.isDirectory = stats.isDirectory();
        this.isFile = stats.isFile();
        if (!this.isFile || global.hostOS !== 'win32') {
            this.callback(this);
            this.callback = null;
            return this;
        }
        let folder = path;
        if (folder.endsWith('/')) {
            this.callback({error: 'Path Not Found'});
            this.callback = null;
            return {error: 'Path Not Found'};
        }
        this.name = folder.split('/').pop();
        folder = WSC.utils.stripOffFile(folder);
        let files;

        if (lastDirReadCache && lastDirReadCache.folder === folder) {
            files = lastDirReadCache.files;
        } else {
            bm = bookmarks.matchAndAccess(folder);
            try {
                files = fs.readdirSync(folder, {encoding: 'utf-8'});
            } catch(e) {
                console.warn('Error reading directory "'+folder+'"', e);
                this.callback({error: 'Path Not Found'});
                this.callback = null;
                bookmarks.release(bm);
                return {error: 'Path Not Found'};
            }
            lastDirReadCache = {folder, files};
            bookmarks.release(bm);
        }

        if (files.includes(this.name)) {
            this.callback(this);
            this.callback = null;
            return this;
        }
        this.callback({error: 'Path Not Found'});
        this.callback = null;
        return {error: 'Path Not Found'};
    }
    // TODO - No callbacks, just return the value
    text(cb) {
        if (typeof cb !== 'function') cb=function(){};
        if (!this.isFile) {
            cb({error: 'Cannot preform on directory'});
            return {error: 'Cannot preform on directory'};
        }
        const result = this.file().toString();
        cb(result);
        return result;
    }
    file(cb) {
        if (typeof cb !== 'function') cb=function(){};
        if (!this.path) {
            cb(null);
            return null;
        }
        if (!this.isFile) {
            cb({error: 'Cannot preform on directory'});
            return {error: 'Cannot preform on directory'};
        }
        const path = this.path;
        const bm = bookmarks.matchAndAccess(path);
        let data;
        try {
            data = fs.readFileSync(path);
        } catch(err) {
            bookmarks.release(bm);
            cb({error:err});
            return {error:err};
        }
        bookmarks.release(bm);
        cb(data);
        return data;
    }
    remove(cb) {
        if (typeof cb !== 'function') cb=function(){};
        if (!this.path) {
            cb(null);
            return null;
        }
        const bm = bookmarks.matchAndAccess(this.path);
        let err;
        try {
            if (this.isDirectory) {
                fs.rmdirSync(this.path, {recursive: false});
            } else {
                fs.unlinkSync(this.path);
            }
        } catch(e) {
            bookmarks.release(bm);
            cb({error: err, success: false});
            return {error: err, success: false};
        }
        bookmarks.release(bm);
        cb({error: false, success: true});
        return {error: false, success: true};
    }
    getDirContents(cb) {
        if (typeof cb !== 'function') cb=function(){};
        if (!this.path) {
            cb(null);
            return null;
        }
        if (this.isFile) {
            cb({error: 'Cannot preform on file'});
            return {error: 'Cannot preform on file'};
        }
        const path = this.path;
        const bm = bookmarks.matchAndAccess(path);
        let files;
        try {
            files = fs.readdirSync(path, {encoding: 'utf-8'});
        } catch(err) {
            bookmarks.release(bm);
            cb({error:err});
            return {error:err};
        }
        bookmarks.release(bm);
        let results = [];
        for (let i=0; i<files.length; i++) {
            const file = new getByPath(this.origpath + '/' + files[i], null, this.fs);
            file.name = files[i];
            results.push(file.getFile());
        }
        lastDirReadCache = null;
        cb(results);
        return results;
    }
}

class FileSystem {
    mainPath;
    constructor(mainPath) {
        mainPath = mainPath.replace(/\/\//g, '/').replace(/\\/g, '/');
        if (mainPath.endsWith('/')) {
            mainPath = mainPath.substring(0, mainPath.length - 1);
        }
        const bm = bookmarks.matchAndAccess(mainPath);
        let stats;
        try {
            stats = fs.statSync(mainPath);
        } catch(e) {
            bookmarks.release(bm);
            throw e;
        }
        bookmarks.release(bm);
        if (!stats.isDirectory()) {
            throw new Error('Entered path is not directory');
        }
        this.mainPath = mainPath;
    }
    // TODO - No callbacks
    getByPath(path, cb) {
        path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        const entry = new getByPath(path, cb, this);
        let rv = entry.getFile();
        lastDirReadCache = null;
        return rv;
    }
    writeFile(path, data, cb, allowOverWrite) {
        if (!Buffer.isBuffer(data)) {
            data = Buffer.from(data);
        }
        path = WSC.utils.relativePath('', path);
        const origpath = path;
        path = this.mainPath + path;
        path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        const folder = WSC.utils.stripOffFile(path);
        let bm = bookmarks.matchAndAccess(folder);
        try {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder, {recursive: true});
            }
        } catch(e) {}
        bookmarks.release(bm);
        bm = bookmarks.matchAndAccess(path);
        let stats, error;
        try {
            stats = fs.statSync(path);
        } catch(e) {
            error = e;
        }
        if (error && error.code === 'ENOENT') {
            try {
                fs.writeFileSync(path, data);
            } catch(err) {
                bookmarks.release(bm);
                cb({error: err, success: false});
                return;
            }
            bookmarks.release(bm);
            cb({error: false, success: true});
        } else if (!error && allowOverWrite) {
            try {
                fs.unlinkSync(path);
            } catch(err) {
                bookmarks.release(bm);
                cb({error: err, success: false});
                return;
            }
            try {
                fs.writeFileSync(path, data);
            } catch(err) {
                bookmarks.release(bm);
                cb({error: err, success: false});
                return;
            }
            bookmarks.release(bm);
            cb({error: false, success: true});
        } else {
            bookmarks.release(bm);
            cb({error: error, success: false});
        }
    }
    createWriteStream(path) {
        path = WSC.utils.relativePath('', path);
        path = this.mainPath + path;
        path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        const folder = WSC.utils.stripOffFile(path);
        let bm = bookmarks.matchAndAccess(folder);
        try {
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder, {recursive: true});
            }
        } catch(e) {
            bookmarks.release(bm);
            return {error: 'Error creating folder'};
        }
        bookmarks.release(bm);
        bm = bookmarks.matchAndAccess(path);
        const stream = fs.createWriteStream(path);
        stream.on('close', function(e) {
            //console.log('close', path);
            bookmarks.release(bm);
        })
        return stream;
    }
    createReadStream(path, opts) {
        path = WSC.utils.relativePath('', path);
        path = this.mainPath + path;
        path = path.replace(/\/\//g, '/').replace(/\\/g, '/');
        const bm = bookmarks.matchAndAccess(path);
        const stream = fs.createReadStream(path, opts);
        stream.on('close', function(e) {
            //console.log('close', path);
            bookmarks.release(bm);
        })
        return stream;
    }
}

module.exports = FileSystem;
