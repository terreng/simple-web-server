global.WSC = {};

WSC.FileSystem = require('./WSC/FileSystem.js');
WSC.createCrypto = require('./WSC/crypto.js');
WSC.utils = require('./WSC/utils.js');
WSC.httpRequest = require('./WSC/httpRequest.js');

var a = require('./WSC/translator.js');
WSC.onRequest = a.onRequest
WSC.transformRequest = a.transformRequest
WSC.HTTPRequest = a.HTTPRequest

var mime = require("./mime.js");
WSC.MIMETYPES = mime.MIMETYPES
WSC.MIMECATEGORIES = mime.MIMECATEGORIES
WSC.HTTPRESPONSES = mime.HTTPRESPONSES

var handlers = require('./WSC/handlers.js');
WSC.DirectoryEntryHandler = handlers.DirectoryEntryHandler
WSC.BaseHandler = handlers.BaseHandler

var main_fs = new WSC.FileSystem(__dirname)
main_fs.getByPath('/directory-listing-template.html', function(file) {
    file.text(function(data) {
        WSC.template_data = data
    })
})
main_fs.getByPath('/directory-listing-template-static.html', function(file) {
    file.text(function(data) {
        WSC.static_template_data = data
    })
})

module.exports = WSC;


