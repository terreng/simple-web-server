var config = {};
var ip;

window.api.initipc(function (event, message) {
    config = message.config;
    ip = message.ip;
    document.body.style.display = "block";
    renderServerList();
    document.querySelector("#background").checked = config.background;
});

function renderServerList() {
var pendhtml = "";
if (config.servers) {
for (var i = 0; i < config.servers.length; i++) {
    pendhtml += '<div class="server '+(config.servers[i].enabled ? "enabled" : "")+'"><div><input type="checkbox" '+(config.servers[i].enabled ? "checked" : "")+' oninput="checkboxChanged()"></div><div onclick="addServer('+i+')"><div>'+htmlescape(config.servers[i].path.split(/[\/\\]/)[config.servers[i].path.split(/[\/\\]/).length-1])+'</div><div>:'+String(config.servers[i].port)+'</div></div></div>'
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
        document.querySelector("#cors").checked = config.servers[editindex].cors;
        document.querySelector("#index").checked = config.servers[editindex].index;
        document.querySelector("#rewrite").checked = config.servers[editindex].rewrite;
        if (config.servers[editindex].rewrite) {
            document.querySelector("#rewrite_options").classList.remove("disabled");
        } else {
            document.querySelector("#rewrite_options").classList.add("disabled");
        }
        document.querySelector("#port").value = config.servers[editindex].port;
        portChange();
        document.querySelector("#regex").value = config.servers[editindex].regex;
        document.querySelector("#rewriteto").value = config.servers[editindex].rewriteto;
		var urlList = ''
		// Will make it easier when https is enabled
		var prot = 'http'
		var port = config.servers[editindex].port
		if (ip.length > 0 && config.servers[editindex].localnetwork) {
			for (var i=0; i<ip.length; i++) {
				if (ip[i] != '127.0.0.1') {
					urlList += '<li><a href="'+prot+'://'+ip[i]+':'+port+'" target="_blank" onclick="window.api.openExternal(this.href);event.preventDefault()">'+prot+'://'+ip[i]+':'+port+'</a></li>'
				}
			}
		}
        document.querySelector("#settings_server_list").innerHTML = config.servers[editindex].enabled ? ('<ul><li><a href="'+prot+'://127.0.0.1:'+port+'" target="_blank" onclick="window.api.openExternal(this.href);event.preventDefault()">'+prot+'://127.0.0.1:'+port+'</a></li>'+urlList+'</ul>') : '<div style="padding-left: 10px;">Not running</div>';
        document.querySelector("#delete_server").style.display = "block";
        document.querySelector("#submit_button").innerText = "Save Changes";
    } else {
        document.getElementById("current_directory").innerHTML = "<span style='color: red;'>Choose a directory</span>"
        document.querySelector("#localnetwork").checked = false;
        document.querySelector("#cors").checked = false;
        document.querySelector("#index").checked = true;
        document.querySelector("#rewrite").checked = false;
        document.querySelector("#rewrite_options").classList.add("disabled");
        document.querySelector("#port").value = 8080;
        document.querySelector("#regex").value = ".*\\.[\\d\\w]+$";
        document.querySelector("#rewriteto").value = "/index.html";
        current_path = false;
        document.querySelector("#settings_server_list").innerHTML = '<div style="padding-left: 10px;">Not running</div>';
        portChange();
        regexchange();
        rewritetochange();
        document.querySelector("#delete_server").style.display = "none";
        document.querySelector("#submit_button").innerText = "Create Server";
    }
    changeSPA();
}

function cancelAddServer() {
    document.querySelector("#server_settings").style.display = "none";
    document.querySelector("#servers").style.display = "block";
}

function submitAddServer() {
    if (Number(document.querySelector("#port").value) >= 1 && Number(document.querySelector("#port").value) <= 65535 && current_path && (!document.querySelector("#rewrite").checked || (validateRegex(document.querySelector("#regex").value) && validatePath(document.querySelector("#rewriteto").value))) && (config.servers || []).map(function(a) {return a.port}).indexOf(Number(document.querySelector("#port").value)) == -1 || (activeeditindex !== false && (config.servers || []).map(function(a) {return a.port}).indexOf(Number(document.querySelector("#port").value)) == activeeditindex)) {
        if (!config.servers) {
            config.servers = [];
        }
        var server_object = {
            "enabled": activeeditindex !== false ? config.servers[activeeditindex].enabled : true,
            "path": current_path,
            "localnetwork": document.querySelector("#localnetwork").checked,
            "index": document.querySelector("#index").checked,
            "port": Number(document.querySelector("#port").value),
            "cors": document.querySelector("#cors").checked,
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
        window.api.saveconfig(config);
    }
}

function deleteServer() {
    config.servers.splice(activeeditindex, 1);
    document.querySelector("#server_settings").style.display = "none";
    document.querySelector("#servers").style.display = "block";
    renderServerList();
    window.api.saveconfig(config);
}

function checkboxChanged() {
var server_checkboxes = document.querySelector("#servers_list").querySelectorAll("input");
for (var i = 0; i < server_checkboxes.length; i++) {
    config.servers[i].enabled = server_checkboxes[i].checked;
}
renderServerList();
window.api.saveconfig(config);
}

function runinbkchanged() {
config.background = document.querySelector("#background").checked;
window.api.saveconfig(config);
}

function portChange() {
    if (Number(document.querySelector("#port").value) >= 1 && Number(document.querySelector("#port").value) <= 65535) {
        document.querySelector("#port").parentElement.nextElementSibling.style.display = "none";
    } else {
        document.querySelector("#port").parentElement.nextElementSibling.style.display = "block";
    }
    if ((config.servers || []).map(function(a) {return a.port}).indexOf(Number(document.querySelector("#port").value)) == -1 || (activeeditindex !== false && (config.servers || []).map(function(a) {return a.port}).indexOf(Number(document.querySelector("#port").value)) == activeeditindex)) {
        document.querySelector("#port").parentElement.nextElementSibling.nextElementSibling.style.display = "none";
    } else {
        document.querySelector("#port").parentElement.nextElementSibling.nextElementSibling.style.display = "block";
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
        regexchange();
        rewritetochange();
    } else {
        document.querySelector("#rewrite_options").classList.add("disabled");
        document.querySelector("#regex").parentElement.nextElementSibling.style.display = "none";
        document.querySelector("#rewriteto").parentElement.nextElementSibling.style.display = "none";
    }
}

function regexchange() {
if (validateRegex(document.querySelector("#regex").value)) {
    document.querySelector("#regex").parentElement.nextElementSibling.style.display = "none";
} else {
    document.querySelector("#regex").parentElement.nextElementSibling.style.display = "block";
}
}

function rewritetochange() {
if (validatePath(document.querySelector("#rewriteto").value)) {
    document.querySelector("#rewriteto").parentElement.nextElementSibling.style.display = "none";
} else {
    document.querySelector("#rewriteto").parentElement.nextElementSibling.style.display = "block";
}
}