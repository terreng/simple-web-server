
function getByPath(path, callback, FileSystem) {
    this.fs = FileSystem
    if (! (path.startsWith('/') || path.startsWith('\\'))) {
        var path = '/' + path
    }
    this.origpath = path.replaceAll('//', '/')
    this.fullPath = this.origpath
    this.path = this.fs.mainPath + WSC.utils.relativePath(path, '').replaceAll('//', '/')
    this.callback = callback
}

getByPath.prototype = {
    getFile: function() {
        var path = this.path
        fs.stat(path, function(error, stats) {
            if (error) {
                try {
                    if (error.path && typeof error.path == 'string' && error.errno == -4048) {
                        var err = { }
                        err.path = error.path.replaceAll('\\', '/').replaceAll('//', '/')
                        if (error.path.endsWith('/')) {
                            var split = err.path.split('/')
                            err.name = split[split.length-1]
                        } else {
                            err.name = err.path.split('/').pop()
                        }
                        err.isDirectory = false
                        err.isFile = true
                        err.error = error
                    }
                    var err = err || {error: error}
                    this.callback(err)
                    return
                } catch(e) {
                    this.callback({error: error})
                    return
                }
            }
            this.size = stats.size
            this.modificationTime = stats.mtime
            this.isDirectory = stats.isDirectory()
            this.isFile = stats.isFile()
			if (this.isFile) {
				var folder = path
				if (folder.endsWith('/')) {
					this.callback({error: 'Path Not Found'})
					this.callback = null
					return
				}
				this.name = folder.split('/').pop()
				var folder = WSC.utils.stripOffFile(folder)
				fs.readdir(folder, {encoding: 'utf-8'}, function(err, files) {
					if (files.includes(this.name)) {
						this.callback(this)
						this.callback = null
					} else {
						this.callback({error: 'Path Not Found'})
						this.callback = null
					}
				}.bind(this))
			} else {
				this.callback(this)
				this.callback = null
			}
        }.bind(this))
    },
    file: function(callback) {
        var path = this.path
        if (! this.isFile) {
            callback({error: 'Cannot preform on directory'})
            return
        }
        fs.readFile(path, 'utf8', function(err, data) {
            if (err) {
                callback({error:err})
                return
            }
            callback(data)
        }.bind(this))
    },
    remove: function(callback) {
        if (! callback) {
            var callback = function() { }
        }
		if (this.isDirectory) {
			fs.rmdir(this.path, { recursive: false }, (err) => {
				if (err) {
					callback({error: err, success: false})
				} else {
					callback({error: false, success: true})
				}
			})
		} else {
			fs.unlink(this.path, (err) => {
				if (err) {
					callback({error: err, success: false})
				} else {
					callback({error: false, success: true})
				}
			})
		}
    },
    getDirContents: function(callback) {
        if (this.isFile) {
            callback({error: 'Cannot preform on file'})
            return
        }
        var path = this.path
        fs.readdir(path, {encoding: 'utf-8'}, function(err, files) {
            if (err) {
                callback({error:err})
                return
            }
            var results = [ ]
            var i = 0
            var totalLength = files.length - 1
            function finished() {
                callback(results)
            }
            function getFileInfo() {
                var file = new getByPath(this.origpath + '/' + files[i], function(file) {
                    results.push(file)
                    if (i != totalLength) {
                        i++
                        getFileInfo.bind(this)()
                    } else {
                        finished.bind(this)()
                    }
                }.bind(this), this.fs)
                file.name = files[i]
                file.getFile()
            }
            if (files.length > 0 && ! err) {
                getFileInfo.bind(this)()
            } else {
                finished.bind(this)()
            }
        }.bind(this))
    }
}


function FileSystem(mainPath) {
    var mainPath = mainPath.replaceAll('\\', '/').replaceAll('\\', '/')
    if (mainPath.endsWith('/')) {
        var mainPath = mainPath.substring(0, mainPath.length - 1)
    }
    this.mainPath = mainPath
}

FileSystem.prototype = {
    getByPath: function(path, callback) {
        var entry = new getByPath(path, callback, this)
        entry.getFile()
    },
    writeFile: function(path, data, callback, allowOverWrite) {
        var path = WSC.utils.relativePath(path, '')
        var origpath = path
        var path = this.mainPath + path
        var folder = WSC.utils.stripOffFile(path)
        if (! fs.existsSync(folder)) {
            try {
                fs.mkdirSync(folder)
            } catch(e) { }
        }
        fs.stat(path, function(error, stats) {
            if (error && error.errno == -4058) {
                fs.writeFile(path, data, function(err){
                    if (err) {
                        callback({error: err, success: false})
                        return
                    }
                    callback({error: false, success: true})
                })
            } else if (! error && allowOverWrite) {
                fs.unlink(path, function(err){
                    if (err) {
                        callback({error: err, success: false})
                        return
                    }
                    fs.writeFile(path, data, function(err){
                        if (err) {
                            callback({error: err, success: false})
                            return
                        }
                        callback({error: false, success: true})
                    })
                })
            } else {
                callback({error: error, success: false})
            }
        })
        
    },
    createWriteStream: function(path) {
        var path = WSC.utils.relativePath(path, '')
        this.origpath = path
        var path = this.mainPath + path
        var path = path.replaceAll('//', '/')
        var folder = WSC.utils.stripOffFile(path)
        if (! fs.existsSync(folder)) {
            try {
                fs.mkdirSync(folder)
            } catch(e) {
                return {error: 'error creating folder'}
            }
        }
        return fs.createWriteStream(path)
    }
}


module.exports = FileSystem

