

String.prototype.htmlEscape = function() {
    return this.replaceAll(/&/g, "&amp;").replaceAll(/</g, "&lt;").replaceAll(/>/g, "&gt;").replaceAll(/"/g, "&quot;").replaceAll(/'/g, "&#039;")
}


module.exports = {
    humanFileSize: function(bytes, si=false, dp=1) {
        if (! bytes) {
            return ''
        }
        //from https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
        const thresh = si ? 1000 : 1024;
        if (Math.abs(bytes) < thresh) {
          return bytes + ' B';
        }
        const units = si 
          ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
          : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        let u = -1;
        const r = 10**dp;
        do {
          bytes /= thresh;
          ++u;
        } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
        return bytes.toFixed(dp) + ' ' + units[u];
    },
    lastModified: function(modificationTime) {
        if (! modificationTime) {
            return 0
        }
        var lastModifiedMonth = modificationTime.getMonth() + 1
        var lastModifiedDay = modificationTime.getDate()
        var lastModifiedYear = modificationTime.getFullYear().toString().substring(2, 4)
        var lastModifiedHours = modificationTime.getHours()
        var lastModifiedMinutes = modificationTime.getMinutes()
        var lastModifiedSeconds = modificationTime.getSeconds()
        var lastModified = lastModifiedMonth+
                           lastModifiedDay+
                           lastModifiedYear+
                           lastModifiedHours+
                           lastModifiedMinutes+
                           lastModifiedSeconds
        return lastModified
    },
    lastModifiedStr: function(modificationTime) {
        if (! modificationTime) {
            return ''
        }
        var lastModifiedMonth = modificationTime.getMonth() + 1
        var lastModifiedDay = modificationTime.getDate()
        var lastModifiedYear = modificationTime.getFullYear().toString().substring(2, 4)
        var lastModifiedHours = modificationTime.getHours()
        var lastModifiedMinutes = modificationTime.getMinutes()
        var lastModifiedSeconds = modificationTime.getSeconds()
        if (lastModifiedSeconds.toString().length != 2) {
            var lastModifiedSeconds = '0' + lastModifiedSeconds
        }
        if (lastModifiedMinutes.toString().length != 2) {
            var lastModifiedMinutes = '0' + lastModifiedMinutes
        }
        if (lastModifiedDay.toString().length != 2) {
            var lastModifiedDay = '0' + lastModifiedDay
        }
        if (lastModifiedHours >= 12) {
            var lastModifiedAmPm = 'PM'
            if (lastModifiedHours > 12) {
                var lastModifiedHours = lastModifiedHours - 12
            }
        } else {
            var lastModifiedAmPm = 'AM'
        }
        var lastModifiedStr = lastModifiedMonth+'/'+
                              lastModifiedDay+'/'+
                              lastModifiedYear+', '+
                              lastModifiedHours+':'+
                              lastModifiedMinutes+':'+
                              lastModifiedSeconds +' '+
                              lastModifiedAmPm
        return lastModifiedStr
    },
    htaccessFileRequested: function(filerequested, index) {
        if (index) {
            if (filerequested == 'index.html' ||
                filerequested == 'index.htm' ||
                filerequested == 'index' ||
                filerequested == 'index.xhtm' ||
                filerequested == 'index.xhtml' ||
                filerequested == '') {
                return 'index'
            } else {
                return filerequested
            }
        } else {
            if (filerequested == 'index.html' ||
                filerequested == 'index.htm' ||
                filerequested == 'index' ||
                filerequested == 'index.xhtm' ||
                filerequested == 'index.xhtml') {
                return 'index'
            } else {
                return filerequested
            }
        }
    },
    relativePath: function(reqPath, curPath) {
        var endWSlash = false
        if (reqPath.endsWith('/')) {
            var endWSlash = true
        }
        var split1 = curPath.split('/')
        var split2 = reqPath.split('/')
        for (var w=0; w<split2.length; w++) {
            if (split2[w] == '' || split2[w] == '.') {
                // . means current directory. Leave this here for spacing
            } else if (split2[w] == '..') {
                if (split1.length > 0) {
                    var split1 = WSC.utils.stripOffFile(split1.join('/')).split('/')
                }
            } else {
                split1.push(split2[w])
            }
        }
        var newPath = split1.join('/').replaceAll('//', '/')
        if (! newPath.startsWith('/')) {
            var newPath = '/' + newPath
        }
        if (endWSlash && ! newPath.endsWith('/')) {
            var newPath = newPath + '/'
        }
        return newPath
    },
    stripOffFile: function(origpath) {
        var fullrequestpath = origpath
        var finpath = fullrequestpath.split('/').pop()
        var finalpath = fullrequestpath.substring(0, fullrequestpath.length - finpath.length)
        if (origpath == '/') {
            return '/'
        } else {
            return finalpath
        }
        
    }
}

