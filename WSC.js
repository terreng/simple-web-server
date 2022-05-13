global.WSC = {};

WSC.FileSystem = require('./WSC/FileSystem.js');
WSC.createCrypto = require('./WSC/crypto.js');
WSC.utils = require('./WSC/utils.js');
WSC.httpRequest = require('./WSC/httpRequest.js');
WSC.proxy = require('./WSC/proxy.js');

var a = require('./WSC/translator.js');
WSC.onRequest = a.onRequest;
WSC.transformRequest = a.transformRequest;
WSC.HTTPRequest = a.HTTPRequest;

var mime = require("./mime.js");
WSC.MIMETYPES = mime.MIMETYPES;
WSC.MIMECATEGORIES = mime.MIMECATEGORIES;
WSC.HTTPRESPONSES = mime.HTTPRESPONSES;

var handlers = require('./WSC/handlers.js');
WSC.DirectoryEntryHandler = handlers.DirectoryEntryHandler;
WSC.BaseHandler = handlers.BaseHandler;

WSC.template_data = fs.readFileSync(path.resolve(__dirname, "directory-listing-template.html"), "utf8");
WSC.static_template_data = fs.readFileSync(path.resolve(__dirname, "directory-listing-template-static.html"), "utf8");

module.exports = WSC;


