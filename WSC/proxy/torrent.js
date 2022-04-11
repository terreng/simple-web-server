module.exports = function(req, res, allowTorrenting) {
    if (!allowTorrenting) {
        res.writeHeader(400);
        res.end('Site owner has disabled torrenting. Please contact the site owner for more information');
        return;
    }
    if (!req.url.includes('magnet=')) {
        res.writeHeader(400);
        res.end('invalid request');
        return;
    }
    res.writeContinue();
    res.setHeader('Access-Control-Allow-Origin', '*');
    var args = transformArgs(req.url.split('magnet=')[0]);
    var stage = args.stage;
    var magnet = req.url.split('magnet=').pop();
    try {
        var engine = torrentStream('magnet:?'+magnet);
    } catch(e) {
        res.end('error getting torrent metedata');
        return;
    }
    var ready = setTimeout(function() {
        engine.destroy();
        res.end('timeout getting torrent metedata');
    }, 20000);
    engine.on('ready', function () {
        clearTimeout(ready);
        var files = engine.files;
        var torrentName = engine.torrent.name;
        if (stage === 'step1') {
            var html = '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Download</title></head><body><br><ul><h1>Download</h1><br>';
            html += generateTorrentTree(files, magnet);
            html += '<br>'
            var downloadUrl2 = '/torrentStream?stage=dlAsZip&magnet='+magnet;
            html += '<br><a style="text-decoration:none" href="'+downloadUrl2+'">Download All As Zip</a></ul><br></body></html>';
            engine.destroy();
            res.setHeader('content-type', 'text/html; chartset=utf-8');
            html = bodyBuffer(html);
            res.setHeader('content-length', html.byteLength);
            res.writeHead(200);
            res.end(html);
        } else if (stage === 'step2') {
            var fileName = args.fileName;
            var file;
            for (var i=0; i<files.length; i++) {
                if (files[i].path === fileName) {
                    file = files[i];
                    break;
                }
            }
            if (! file) {
                res.writeHead(500);
                res.end('error finding file');
                engine.destroy();
                return;
            }
            var ct = MIMETYPES[file.name.split('.').pop()].split('/')[0];
            if (args.stream === 'on' && args.fetchFile === 'no') {
                var downloadUrl = '/torrentStream?fileName='+encodeURIComponent(file.path)+'&stage=step2&stream=on&magnet='+magnet;
                var tagName = ['video', 'audio'].includes(ct) ? ct : ('image' === ct ? 'img' : 'iframe');
                res.setHeader('content-type', 'text/html; chartset=utf-8');
                var html = '<html><head><style>.nb{text-decoration:none;display:inline-block;padding:8px 16px;border-radius:12px;transition:0.35s;color:black;}.previous{background-color:#00b512;}.previous:hover{background-color:#ee00ff;}.next{background-color:#ffa600;}.next:hover{background-color:#0099ff;}</style><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+file.name+'</title></head><body><br><br><br><center>';
                html += ('<'+tagName);
                if (['video', 'image'].includes(ct)) {
                    html += ' height="75%"';
                }
                if (['video', 'audio'].includes(ct)) {
                    html += ' controls preload=auto';
                }
                if (!['video', 'audio', 'image'].includes(ct)) {
                    html += ' frameBorder="0" height="75%"';
                }
                html += ' id="element" src="'+downloadUrl+'"></'+tagName+'>';
                if (['video', 'audio'].includes(ct)) {
                    html += '<script>var element = document.getElementById("element");var errCt=0;function err(e){if(errCt>25){return};errCt++;var a=element.src;element.src=a;element.play()};element.addEventListener("abort", err);element.addEventListener("error", err);element.play();</script>';
                }
                html += '<h2>'+file.name+'</h2><br>';
                var nb = getConcurentFiles(file.path, files, magnet);
                if (nb) {
                    if (nb[0]) {
                        html += '<a href="'+nb[0]+'" class="previous nb">&laquo; Previous</a>';
                    }
                    if (nb[0] && nb[1]) {
                        html += ' ';
                    }
                    if (nb[1]) {
                        html += '<a href="'+nb[1]+'" class="next nb">Next &raquo;</a>';
                    }
                }
                html += '</center><br><ul>';
                html += generateTorrentTree(files, magnet);
                html += '</ul><br><br></body></html>';
                html = bodyBuffer(html);
                res.setHeader('content-length', html.byteLength);
                res.writeHead(200);
                res.end(html);
                return;
            }
            res.setHeader('content-length', file.length);
            res.setHeader('accept-ranges','bytes');
            if (MIMETYPES[file.name.split('.').pop()]) {
                res.setHeader('content-type', MIMETYPES[file.name.split('.').pop().toLowerCase()]);
            }
            var fileOffset, fileEndOffset;
            if ((args.stream && args.stream === 'on') || req.headers['range']) {
                res.setHeader('Content-Disposition', 'inline; filename="'+encodeURIComponent(fileName)+'"');
            } else {
                res.setHeader('Content-Disposition', 'attachment; filename="'+encodeURIComponent(fileName)+'"');
            }
            if (req.headers['range']) {
                console.log('range request')
                var range = req.headers['range'].split('=')[1].trim();
                var rparts = range.split('-');
                if (! rparts[1]) {
                    fileOffset = parseInt(rparts[0]);
                    var fileEndOffset = file.length - 1;
                    res.setHeader('content-length', file.length-fileOffset);
                    res.setHeader('content-range','bytes '+fileOffset+'-'+(file.length-1)+'/'+file.length);
                    if (fileOffset == 0) {
                        res.writeHead(200);
                    } else {
                        res.writeHead(206);
                    }
                } else {
                    fileOffset = parseInt(rparts[0]);
                    fileEndOffset = parseInt(rparts[1])
                    res.setHeader('content-length', fileEndOffset - fileOffset + 1);
                    res.setHeader('content-range','bytes '+fileOffset+'-'+(fileEndOffset)+'/'+file.length)
                    res.writeHead(206);
                }
            } else {
                fileOffset = 0;
                fileEndOffset = file.length - 1;
                res.writeHead(200);
            }
            var stream = file.createReadStream({start: fileOffset,end: fileEndOffset});
            stream.pipe(res);
            stream.on('finish', function() {
                engine.destroy();
            })
        } else if (stage === 'dlAsZip') {
            var zip = new JSZip();
            for (var i=0; i<files.length; i++) {
                zip.file(files[i].path, files[i].createReadStream())
            }
            res.setHeader('content-type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename="'+encodeURIComponent(torrentName+'.zip')+'"');
            res.writeHead(200);
            var stream = zip.generateNodeStream({streamFiles:true});
            stream.pipe(res);
            stream.on('finish', function() {
                engine.destroy();
            })
        } else {
            res.end('invalid request');
            engine.destroy();
        }
    })
}
