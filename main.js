var config = {};
var ip;

window.api.initipc(function (event, message) {
    config = message.config;
    ip = message.ip;
    openMain();
    if (config.darkmode) {
        document.body.classList.add("darkmode");
    }
    document.body.style.display = "block";
});

window.onresize = function() {
    reevaluateSectionHeights();
}

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
    if (config.darkmode) {
        document.querySelector("#darkmode").classList.add("checked");
    } else {
        document.querySelector("#darkmode").classList.remove("checked");
    }
}

var current_path = false;
var activeeditindex = false;

function addServer(editindex) {
    resetAllSections();
    navigate("server");
    document.getElementById("server_container").scrollTop = 0;
    if (editindex != null) {
        document.querySelector("#edit_server_title").innerText = "Edit Server";
        document.querySelector("#submit_button").innerText = "Save Changes";
    } else {
        document.querySelector("#edit_server_title").innerText = "Add Server";
        document.querySelector("#submit_button").innerText = "Create Server";
    }
    activeeditindex = (editindex != null ? editindex : false);

    if (editindex != null) {
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

        current_path = config.servers[editindex].path;
        updateCurrentPath();
        document.querySelector("#port").value = config.servers[editindex].port;
        portChange();
        toggleCheckbox("localnetwork", config.servers[editindex].localnetwork || false);

        toggleCheckbox("showIndex", config.servers[editindex].showIndex || true);
        toggleCheckbox("spa", config.servers[editindex].spa || false);
        toggleCheckbox("directoryListing", config.servers[editindex].directoryListing || true);
        toggleCheckbox("excludeDotHtml", config.servers[editindex].excludeDotHtml || false);

        document.querySelector("#cacheControl").value = config.servers[editindex].cacheControl || "";
        toggleCheckbox("hiddenDotFiles", config.servers[editindex].hiddenDotFiles || false);
        toggleCheckbox("upload", config.servers[editindex].upload || false);
        toggleCheckbox("replace", config.servers[editindex].replace || false);
        toggleCheckbox("delete", config.servers[editindex].delete || false);
        toggleCheckbox("staticDirectoryListing", config.servers[editindex].staticDirectoryListing || false);
        toggleCheckbox("hiddenDotFilesDirectoryListing", config.servers[editindex].hiddenDotFilesDirectoryListing || true);
        toggleCheckbox("htaccess", config.servers[editindex].htaccess || false);

        document.querySelector("#custom404").value = config.servers[editindex].custom404 || "";
        document.querySelector("#custom403").value = config.servers[editindex].custom403 || "";
        document.querySelector("#custom401").value = config.servers[editindex].custom401 || "";
        document.querySelector("#customErrorReplaceString").value = config.servers[editindex].customErrorReplaceString || "";

        toggleCheckbox("https", config.servers[editindex].https || false);
        document.querySelector("#httpsCert").value = config.servers[editindex].httpsCert || "";
        document.querySelector("#httpsKey").value = config.servers[editindex].httpsKey || "";
        toggleCheckbox("httpAuth", config.servers[editindex].httpAuth || false);
        document.querySelector("#httpAuthUsername").value = config.servers[editindex].httpAuthUsername || "";
        document.querySelector("#httpAuthPassword").value = config.servers[editindex].httpAuthPassword || "";
        document.querySelector("#ipThrottling").value = config.servers[editindex].ipThrottling || 10;

        document.querySelector("#delete_server_option").style.display = "block";
        document.querySelector("#submit_button").innerText = "Save Changes";
    } else {
        document.querySelector("#settings_server_list").innerHTML = '<div style="padding-left: 10px;">Not running</div>';

        current_path = false;
        updateCurrentPath();
        document.querySelector("#port").value = 8080;
        portChange();
        toggleCheckbox("localnetwork", false);

        toggleCheckbox("showIndex", true);
        toggleCheckbox("spa", false);
        toggleCheckbox("directoryListing", true);
        toggleCheckbox("excludeDotHtml", false);

        document.querySelector("#cacheControl").value = "";
        toggleCheckbox("hiddenDotFiles", false);
        toggleCheckbox("upload", false);
        toggleCheckbox("replace", false);
        toggleCheckbox("delete", false);
        toggleCheckbox("staticDirectoryListing", false);
        toggleCheckbox("hiddenDotFilesDirectoryListing", true);
        toggleCheckbox("htaccess", false);

        document.querySelector("#custom404").value = "";
        document.querySelector("#custom403").value = "";
        document.querySelector("#custom401").value = "";
        document.querySelector("#customErrorReplaceString").value = "";

        toggleCheckbox("https", false);
        document.querySelector("#httpsCert").value = "";
        document.querySelector("#httpsKey").value = "";
        toggleCheckbox("httpAuth", false);
        document.querySelector("#httpAuthUsername").value = "";
        document.querySelector("#httpAuthPassword").value = "";
        document.querySelector("#ipThrottling").value = 10;

        document.querySelector("#delete_server_option").style.display = "none";
        document.querySelector("#submit_button").innerText = "Create Server";
    }
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

var pend_delete_server_id = false;

function confirmDeleteServer() {
    config.servers.splice(pend_delete_server_id, 1);
    navigate("main");
    renderServerList();
    window.api.saveconfig(config);
    hidePrompt();
}

function deleteServer() {
    pend_delete_server_id = activeeditindex;
    showPrompt("Delete server?", "This action cannot be undone.", [["Confirm","destructive",function() {confirmDeleteServer()}],["Cancel","",function() {hidePrompt()}]])
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

function toggleDarkMode() {
if (config.darkmode) {
    document.querySelector("#darkmode").classList.remove("checked");
    config.darkmode = false;
    document.body.classList.remove("darkmode");
} else {
    document.querySelector("#darkmode").classList.add("checked");
    config.darkmode = true
    document.body.classList.add("darkmode");
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
    document.querySelector("#path").value = current_path ? current_path : "";
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
        document.getElementById("prompt_actions").innerHTML = buttons.map(function(a) {return '<div class="button ' + a[1] + '" style="margin-left: 10px;" onclick="' + (typeof a[2] == "string" ? a[2] : "") + '"><span>' + a[0] + '</span></div>'}).join("");;
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

function isChecked(element_or_id) {
    element_or_id = typeof element_or_id == "string" ? document.getElementById(element_or_id) : element_or_id;
    return element_or_id.classList.contains("checked");
}

function resetAllSections() {
    var sections = document.querySelectorAll(".settings_section_header");
    for (var i = 0; i < sections.length; i++) {
        if (sections[i].classList.contains("section_visible")) {
            toggleSection(sections[i]);
        }
    }
}

function toggleSection(element) {
    if (element.classList.contains("section_visible")) {
        element.classList.remove("section_visible");
        element.nextElementSibling.style.height = "";
        element.nextElementSibling.classList.remove("section_content_visible");
    } else {
        element.classList.add("section_visible");
        element.nextElementSibling.style.height = element.nextElementSibling.children[0].clientHeight+"px";
        element.nextElementSibling.classList.add("section_content_visible");
    }
}

function reevaluateSectionHeights() {
    var sections = document.querySelectorAll(".settings_section_header");
    for (var i = 0; i < sections.length; i++) {
        if (sections[i].classList.contains("section_visible")) {
            sections[i].nextElementSibling.style.height = sections[i].nextElementSibling.children[0].clientHeight+"px";
        }
    }
}