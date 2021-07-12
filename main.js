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
    pendhtml += '<div class="server"><div><input type="checkbox"></div><div onclick="addServer('+i+')"><div>'+htmlescape(config.servers[i].path.split("/")[config.servers[i].path.split("/").length-1])+'</div><div>:'+String(config.servers[i].port)+'</div></div></div>'
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

var current_path = false;
var activeeditindex = false;

function addServer(editindex) {
    document.querySelector("#server_settings").style.display = "block";
    document.querySelector("#servers").style.display = "none";
    activeeditindex = (editindex != null ? editindex : false);

    if (editindex != null) {
        current_path = config.servers[editindex].path;
        updateCurrentPath();
        document.querySelector("#localnetwork").checked = config.servers[editindex].localnetwork;
        document.querySelector("#index").checked = config.servers[editindex].index;
        document.querySelector("#rewrite").checked = config.servers[editindex].rewrite;
        if (config.servers[editindex].rewrite) {
            document.querySelector("#rewrite_options").classList.remove("disabled");
        } else {
            document.querySelector("#rewrite_options").classList.add("disabled");
        }
        document.querySelector("#port").value = config.servers[editindex].port;
        document.querySelector("#regex").value = config.servers[editindex].regex;
        document.querySelector("#rewriteto").value = config.servers[editindex].rewriteto;
        document.querySelector("#settings_server_list").innerHTML = '<ul><li><a href="http://127.0.0.1:'+config.servers[editindex].port+'" target="_blank" onclick="window.api.openExternal(this.href);event.preventDefault()">http://127.0.0.1:'+config.servers[editindex].port+'</a></li></ul>';
    } else {
        document.getElementById("current_directory").innerHTML = "<span style='color: red;'>Choose a directory</span>"
        document.querySelector("#localnetwork").checked = false;
        document.querySelector("#index").checked = true;
        document.querySelector("#rewrite").checked = false;
        document.querySelector("#rewrite_options").classList.add("disabled");
        document.querySelector("#port").value = 8080;
        document.querySelector("#regex").value = ".*\\.[\\d\\w]+$";
        document.querySelector("#rewriteto").value = "/index.html";
        current_path = false;
        document.querySelector("#settings_server_list").innerHTML = "";
    }
    changeSPA();
}

function cancelAddServer() {
    document.querySelector("#server_settings").style.display = "none";
    document.querySelector("#servers").style.display = "block";
}

function submitAddServer() {
    if (document.querySelector("#port").value >= 1 && document.querySelector("#port").value <= 65535 && current_path && (!document.querySelector("#rewrite").checked || (validateRegex(document.querySelector("#regex").value) && validatePath(document.querySelector("#rewriteto").value)))) {
        if (!config.servers) {
            config.servers = [];
        }
        var server_object = {
            "path": current_path,
            "localnetwork": document.querySelector("#localnetwork").checked,
            "index": document.querySelector("#index").checked,
            "port": document.querySelector("#port").value,
            "rewrite": document.querySelector("#rewrite").checked,
            "regex": document.querySelector("#regex").value,
            "rewriteto": document.querySelector("#rewriteto").value
        };
        if (activeeditindex !== false) {
            config.servers[activeeditindex] = server_object;
        } else {
            config.servers.push(server_object)
        }
        document.querySelector("#server_settings").style.display = "none";
        document.querySelector("#servers").style.display = "block";
        renderServerList();
    }
}

function portChange() {
    if (document.querySelector("#port").value >= 1 && document.querySelector("#port").value <= 65535) {
        document.querySelector("#port").parentElement.nextElementSibling.style.display = "none";
    } else {
        document.querySelector("#port").parentElement.nextElementSibling.style.display = "block";
    }
}

function updateCurrentPath() {
    if (current_path) {
        document.getElementById("current_directory").innerHTML = "Current path: <br><div style='font-family: monospace;background: #e4e4e4;margin-top: 5px;font-size: 16px;'>"+htmlescape(current_path)+"</div>";
    }
}

function validateRegex(regex_string) {
    var valid = true;
    try {
        new RegExp(regex_string);
    } catch(e) {
        valid = false;
    }
    return valid;
}

function validatePath() {
    return true;
}

function changeSPA() {
    if (document.querySelector("#rewrite").checked) {
        document.querySelector("#rewrite_options").classList.remove("disabled");
    } else {
        document.querySelector("#rewrite_options").classList.add("disabled");
    }
}