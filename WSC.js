global.WSC = {};

WSC.FileSystem = require('./WSC/FileSystem.js');
WSC.createCrypto = require('./WSC/crypto.js');
WSC.utils = require('./WSC/utils.js');
WSC.httpRequest = require('./WSC/httpRequest.js');
WSC.htaccess = require('./WSC/htaccess.js');

const a = require('./WSC/translator.js');
WSC.onRequest = a.onRequest;
WSC.transformRequest = a.transformRequest;
WSC.HTTPRequest = a.HTTPRequest;

const mime = require("./mime.js");
WSC.MIMETYPES = mime.MIMETYPES;
WSC.MIMECATEGORIES = mime.MIMECATEGORIES;
WSC.HTTPRESPONSES = mime.HTTPRESPONSES;

WSC.DirectoryEntryHandler = require('./WSC/handlers.js');

const main_fs = new WSC.FileSystem(__dirname)
WSC.template_data = global.fs.readFileSync(global.path.resolve(__dirname, "directory-listing-template.html"), "utf8");
WSC.static_template_data = global.fs.readFileSync(global.path.resolve(__dirname, "directory-listing-template-static.html"), "utf8");

module.exports = WSC;
