var fs = require("fs");

//Generate versions json
if (!fs.existsSync("src/.vuepress/dist/versions")){
    fs.mkdirSync("src/.vuepress/dist/versions");
}
var versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));
for (var i = 0; i < Object.keys(versions.versions).length; i++) {
    fs.writeFileSync("src/.vuepress/dist/versions/"+Object.keys(versions.versions)[i]+".json", JSON.stringify((Object.keys(versions.versions)[i] !== versions.latest) ? {"update": true, "version": versions.latest, "name": versions.versions[versions.latest].name, "download": versions.versions[versions.latest].download} : {"update": false}), "utf8");
}