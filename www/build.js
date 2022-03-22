var markdown = require("markdown").markdown;
var fs = require("fs");
var path = require("path");

//Copy static files
if (!fs.existsSync("www/out")){
    fs.mkdirSync("www/out");
}
fs.copyFileSync("www/index.html", "www/out/index.html");
fs.copyFileSync("www/style.css", "www/out/style.css");
fs.copyFileSync("www/404.html", "www/out/404.html");

//convert to markdown and fix links



//Generate versions json
if (!fs.existsSync("www/out/versions")){
    fs.mkdirSync("www/out/versions");
}
var versions = JSON.parse(fs.readFileSync("www/versions.json", "utf8"));
for (var i = 0; i < Object.keys(versions.versions).length; i++) {
    fs.writeFileSync("www/out/versions/"+Object.keys(versions.versions)[i]+".json", JSON.stringify((Object.keys(versions.versions)[i] !== versions.latest) ? {"update": true, "version": versions.latest, "name": versions.versions[versions.latest].name, "download": versions.versions[versions.latest].download} : {"update": false}), "utf8");
}