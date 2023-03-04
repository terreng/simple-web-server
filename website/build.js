var fs = require("fs");

//Generate versions json
if (!fs.existsSync("src/.vuepress/dist/versions")){
    fs.mkdirSync("src/.vuepress/dist/versions");
}
var versions = JSON.parse(fs.readFileSync("versions.json", "utf8"));
for (var i = 0; i < Object.keys(versions.versions).length; i++) {
    var update_object = {"update": false};
    if (Number(Object.keys(versions.versions)[i]) < Number(versions.latest) && (Number(Object.keys(versions.versions)[i]) > 1002005 || Number(Object.keys(versions.versions)[i]) < 1002000)) {
        update_object = {
            "update": true,
            "version": versions.latest,
            "name": versions.versions[versions.latest].name,
            "download": versions.versions[versions.latest].download
        }
        if (versions.versions[versions.latest].banner_text) {
            update_object["banner_text"] = versions.versions[versions.latest].banner_text;
        }
        if (versions.versions[versions.latest].attributes) {
            update_object["attributes"] = versions.versions[versions.latest].attributes;
        }
    }
    fs.writeFileSync("src/.vuepress/dist/versions/"+Object.keys(versions.versions)[i]+".json", JSON.stringify(update_object, "utf8"));
}
/*
var static_files = [
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
    "apple-touch-icon.png",
    "browserconfig.xml",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "favicon.ico",
    "mstile-150x150.png",
    "site.webmanifest"
]
for (var i = 0; i < static_files.length; i++) {
    fs.copyFileSync("src/"+static_files[i], "src/.vuepress/dist/"+static_files[i]);
}*/
