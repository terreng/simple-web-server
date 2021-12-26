var config = {};
var ip;

window.api.initipc(function (event, message) {
    config = message.config;
    ip = message.ip;
    openMain();
    document.body.style.display = "block";
});

var screens = ["main", "settings", "server"]
function navigate(screen) {
    for (var i = 0; i < screens.length; i++) {
        if (document.getElementById(screens[i]+"_title")) {
            document.getElementById(screens[i]+"_title").style.display = (screens[i] == screen ? "block" : "none");
        }
        if (document.getElementById(screens[i]+"_container")) {
            document.getElementById(screens[i]+"_container").style.display = (screens[i] == screen ? "block" : "none");
        }
        if (document.getElementById(screens[i]+"_actions")) {
            document.getElementById(screens[i]+"_actions").style.display = (screens[i] == screen ? "block" : "none");
        }
    }
}

function openMain() {
    navigate("main");
    renderServerList();
}

function backToMain() {
    openMain();
}

function renderServerList() {
    var pendhtml = "";
    if (config.servers) {
    for (var i = 0; i < config.servers.length; i++) {
        pendhtml += '<div class="server '+(config.servers[i].enabled ? "enabled" : "")+'"><div><input type="checkbox" '+(config.servers[i].enabled ? "checked" : "")+' oninput="checkboxChanged()"></div><div onclick="addServer('+i+')"><div>'+htmlescape(config.servers[i].path.split(/[\/\\]/)[config.servers[i].path.split(/[\/\\]/).length-1])+'</div><div>:'+String(config.servers[i].port)+'</div></div></div>'
    }
    }
    document.getElementById("servers_list").innerHTML = pendhtml;
}

function openSettings() {
    navigate("settings");
    if (config.background) {
        document.querySelector("#background").classList.add("checked");
    } else {
        document.querySelector("#background").classList.remove("checked");
    }
}

var current_path = false;
var activeeditindex = false;

function addServer(editindex) {
    navigate("server");
    if (editindex != null) {
        document.querySelector("#edit_server_title").innerText = "Edit Server";
        document.querySelector("#submit_button").innerText = "Save Changes";
    } else {
        document.querySelector("#edit_server_title").innerText = "Add Server";
        document.querySelector("#submit_button").innerText = "Create Server";
    }
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
		var prot = config.servers[editindex].https ? 'https' : 'http'
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
    navigate("main");
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
        navigate("main");
        renderServerList();
        window.api.saveconfig(config);
    }
}

function deleteServer() {
    config.servers.splice(activeeditindex, 1);
    navigate("main");
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

function toggleRunInBk() {
if (config.background) {
    document.querySelector("#background").classList.remove("checked");
    config.background = false;
} else {
    document.querySelector("#background").classList.add("checked");
    config.background = true
}
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

function htmlescape(str) {
if (str == undefined) {
return str;
}
str = String(str);
return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function showPrompt(title, content, buttons) {
    document.getElementById("prompt_bk").style.pointerEvents = "";
    document.getElementById("prompt").classList.add("prompt_show");
    document.getElementById("prompt").classList.remove("prompt_hide");
    document.getElementById("prompt_bk").classList.add("active");
    
    if (title) {
        document.getElementById("prompt_title").innerHTML = title;
        document.getElementById("prompt_title").style.display = "";
    } else {
        document.getElementById("prompt_title").style.display = "none";
    }
    document.getElementById("prompt_text").innerHTML = content;

    if (buttons) {
        document.getElementById("prompt_actions").style.display = "block";
        document.getElementById("prompt_actions").innerHTML = buttons.map(function(a, b, c) {return '<div class="button ' + b + '" style="margin-left: 10px;" onclick="' + (typeof c == "string" ? c : "") + '"><span>' + a + '</span></div>'}).join("");;
        for (var i = 0; i < buttons.length; i++) {
            if (typeof buttons[i][2] == "function") {
                document.getElementById("prompt_actions").children[i].onclick = buttons[i][2];
            }
        }
    } else {
        document.getElementById("prompt_actions").style.display = "none";
    }
}

function hidePrompt() {
    document.getElementById("prompt").classList.add("prompt_hide");
    document.getElementById("prompt").classList.remove("prompt_show");
    document.getElementById("prompt_bk").classList.remove("active");
}

function toggleCheckbox(element_or_id, toggled) {
element_or_id = typeof element_or_id == "string" ? document.getElementById(element_or_id) : element_or_id;
toggled = toggled != null ? toggled : !element_or_id.classList.contains("checked");
if (toggled) {
    element_or_id.classList.add("checked");
    element_or_id.querySelector(".checkbox i").innerText = "check_box";
} else {
    element_or_id.classList.remove("checked");
    element_or_id.querySelector(".checkbox i").innerText = "check_box_outline_blank";
}
}
