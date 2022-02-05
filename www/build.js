var markdown = require("markdown").markdown;
var fs = require("fs");
var path = require("path");

//Copy static files
if (!fs.existsSync("www/out")){
    fs.mkdirSync("www/out");
}
fs.copyFileSync("www/index.html", "www/out/index.html");
fs.copyFileSync("www/style.css", "www/out/style.css");

//convert to markdown and fix links