if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function(a, b) {
        return this.split(a).join(b);
    }
}
String.prototype.htmlEscape = function() {
    return this.replaceAll(/&/g, "&amp;").replaceAll(/</g, "&lt;").replaceAll(/>/g, "&gt;").replaceAll(/"/g, "&quot;").replaceAll(/'/g, "&#039;");
}

module.exports = {
    humanFileSize: function(bytes) {
        if (! bytes) {
            return '';
        }
        //from https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
        const thresh = 1024;
        if (Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }
        const units = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        let u = -1;
        const r = 10;
        do {
            bytes /= thresh;
            ++u;
        } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
        return bytes.toFixed(1) + ' ' + units[u];
    },
    lastModified: function(modificationTime) {
        if (! modificationTime) return 0;
        const lastModifiedMonth = modificationTime.getMonth() + 1;
        const lastModifiedDay = modificationTime.getDate();
        const lastModifiedYear = modificationTime.getFullYear().toString().substring(2, 4);
        const lastModifiedHours = modificationTime.getHours();
        const lastModifiedMinutes = modificationTime.getMinutes();
        const lastModifiedSeconds = modificationTime.getSeconds();
        const lastModified = lastModifiedMonth+
              lastModifiedDay+
              lastModifiedYear+
              lastModifiedHours+
              lastModifiedMinutes+
              lastModifiedSeconds;
        return lastModified;
    },
    lastModifiedStr: function(date) {
        if (!date) return '';
        return date.toLocaleString();
    },
    htaccessFileRequested: function(file, index) {
        let pathArr = ['index.html', 'index.htm', 'index', 'index.xhtm', 'index.xhtml'];
        if (index) pathArr.push('');
        return pathArr.includes(file) ? 'index' : file;
    },
    relativePath: function(curPath, reqPath) {
        let endWSlash = false;
        if (reqPath.endsWith('/')) {
            endWSlash = true;
        }
        let split1 = curPath.split('/');
        let split2 = reqPath.split('/');
        for (let w=0; w<split2.length; w++) {
            if (['', '.'].includes(split2[w])) {
                // . means current directory. Leave this here for spacing
            } else if (split2[w] === '..') {
                if (split1.length > 0) {
                    split1 = WSC.utils.stripOffFile(split1.join('/')).split('/');
                }
            } else {
                split1.push(split2[w]);
            }
        }
        let newPath = split1.join('/').replace(/\/\//g, '/');
        if (! newPath.startsWith('/')) {
            newPath = '/' + newPath;
        }
        if (endWSlash && !newPath.endsWith('/')) {
            newPath = newPath + '/';
        }
        return newPath;
    },
    stripOffFile: function(origpath) {
        if (origpath === '/') return '/';
        return origpath.substring(0, origpath.length - origpath.split('/').pop().length);
    },
    isHidden: function(path) {
        //RegExp from https://stackoverflow.com/questions/18973655/how-to-ignore-hidden-files-in-fs-readdir-result/37030655#37030655
        const a = path.split('/');
        for (let i=0; i<a.length; i++) {
            if ((/(^|\/)\.[^\/\.]/g).test(a[i])) return true;
        }
        return false;
    }
}
