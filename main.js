var config = {};

window.api.initipc(function (event, message) {
    config = message;
    document.body.style.display = "block";
    renderServerList();
});

function renderServerList() {
var pendhtml = "";
if (config.servers) {
for (var i = 0; i < config.servers.length; i++) {
    pendhtml += '<div class="server"><div><input type="checkbox"></div><div><div>'+htmlescape(config.servers.shortpath)+'</div><div>:'+String(config.servers.port)+'</div></div></div>'
}
}
document.getElementById("servers_list").innerHTML = pendhtml;
}

function htmlescape(str) {
if (str == undefined) {
return str;
}
str = String(str);
return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}