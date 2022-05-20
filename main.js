var config = {};
var ip;
var server_states = [];
var running_states = {
    "stopped": {
        "text": "Stopped",
        "list_color": "gray",
        "edit_color": "var(--text-primary)"
    },
    "starting": {
        "text": "Starting...",
        "list_color": "gray",
        "edit_color": "var(--text-primary)"
    },
    "running": {
        "text": "Running",
        "list_color": "green",
        "edit_color": "green"
    },
    "error": {
        "text": "Error",
        "list_color": "red",
        "edit_color": "red"
    },
    "unknown": {
        "text": "Starting...",
        "list_color": "gray",
        "edit_color": "var(--text-primary)"
    },
}

window.api.initipc(function (event, message) {
    if (message.type == "init") {
        config = message.config;
        ip = message.ip;
        if (config.background != null && config.updates != null) {
            openMain();
        } else {
            initWelcome();
        }
        document.getElementById("stop_and_quit_button").style.display = config.background ? "block" : "none";
        if (config.darkmode) {
            document.body.classList.add("darkmode");
        }
        document.body.style.visibility = "visible";
    }
    if (message.type == "state") {
        server_states = message.server_states;
        updateRunningStates();
    }
    if (message.type == "update") {
        document.getElementById("update_banner").style.display = "block";
        document.getElementById("update_banner").href = message.url;
        document.getElementById("update_banner_text").innerText = message.text || "An updated version of Simple Web Server is available";
        if (message.attributes.indexOf("high_priority") > -1) {
            document.getElementById("update_banner").classList.add("high_priority");
        } else {
            document.getElementById("update_banner").classList.remove("high_priority");
        }
    }
    if (message.type == "ipchange") {
        ip = message.ip;
        updateOnIpChange();
    }
});

window.onresize = function() {
    reevaluateSectionHeights();
}

var screens = ["main", "settings", "server", "licenses", "welcome"]
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

function backToSettings() {
    openSettings(true);
}

var loaded_licenses = false;

function openLicenses() {
    if (loaded_licenses !== true) {
        fetch('open_source_licenses.txt').then(response => response.text()).then(function(text) {
            fetch('LICENSE').then(response => response.text()).then(function(text2) {
                loaded_licenses = true;
                document.querySelector("#licenses_content").innerText = text2+"\n"+text;
            })
        })
    }
    navigate("licenses");
    document.querySelector("#licenses_container").scrollTop = 0;
}

function renderServerList() {
    var pendhtml = "";
    for (var i = 0; i < (config.servers || []).length; i++) {
        pendhtml += '<div class="server '+(config.servers[i].enabled ? "checked" : "")+'" id="server_'+i+'"><div onclick="toggleServer('+i+')"><div class="switch"></div></div><div onclick="addServer('+i+')"><div>'+htmlescape(config.servers[i].path)+'</div><div><span class="server_status" style="color: '+running_states[getServerStatus(config.servers[i]).state].list_color+';">'+running_states[getServerStatus(config.servers[i]).state].text+'</span> &bull; Port '+String(config.servers[i].port)+(config.servers[i].ipv6 ? ' &bull; IPv6' : '')+(config.servers[i].localnetwork ? ' &bull; LAN' : '')+(config.servers[i].https ? ' &bull; HTTPS' : '')+'</div></div></div>'
    }
    if (pendhtml == "") {
        pendhtml = '<div style="color: var(--fullscreen_placeholder);text-align: center;position: absolute;top: 48%;width: 100%;transform: translateY(-50%);"><i class="material-icons" style="font-size: 70px;">dns</i><div style="font-size: 18px;padding-top: 20px;">You haven\'t created any servers yet</div></div>';
    }
    document.getElementById("servers_list").innerHTML = pendhtml;
}

function getServerStatus(local_config) {
    if (local_config.enabled) {
        for (var i = 0; i < server_states.length; i++) {
            if (configsEqual(server_states[i].config, local_config)) {
                return {"state": server_states[i].state, "error_message": server_states[i].error_message}
            }
        }
        return {"state": "unknown"};
    } else {
        return {"state": "stopped"};
    }
}

function getServerStatusBox(local_config) {
    if (local_config.enabled) {
        if (getServerStatus(local_config).state == "running") {

            var url_list = [];

            for (var i = 0; i < ip.length; i++) {
                if ((ip[i][0] == '127.0.0.1' && local_config.ipv6 != true) || (ip[i][0] == '::1' && local_config.ipv6 == true) || (local_config.localnetwork && ((ip[i][1] == "ipv4") || (ip[i][1] == "ipv6" && local_config.ipv6 == true)))) {
                    url_list.push((local_config.https ? 'https' : 'http')+'://'+(ip[i][1] == "ipv6" ? "["+ip[i][0]+"]" : ip[i][0])+':'+local_config.port);
                }
            }
        
            return '<div class="status_box"><div>Web server URL'+(url_list.length == 1 ? '' : 's')+'</div><div>'+url_list.map(function(a) {return '<a href="'+a+'" target="_blank" onclick="window.api.openExternal(this.href);event.preventDefault()">'+a+'</a>'}).join('<div style="padding-top: 6px;"></div>')+"</div></div>";

        } else if (getServerStatus(local_config).state == "error") {
            if (getServerStatus(local_config).error_message.indexOf("EADDRINUSE") > -1) {
                return '<div class="status_box error_status_box"><div>Port in use</div><div>Web server failed to start because port '+local_config.port+' is already in use by another program.</div></div>';
            } else {
                return '<div class="status_box error_status_box"><div>Error</div><div>'+htmlescape(getServerStatus(local_config).error_message)+'</div></div>';
            }
        } else {
            return "";
        }
    } else {
        return "";
    }
}

function updateRunningStates() {
    for (var i = 0; i < (config.servers || []).length; i++) {
        document.getElementById("server_"+i).querySelector(".server_status").innerHTML = running_states[getServerStatus(config.servers[i]).state].text;
        document.getElementById("server_"+i).querySelector(".server_status").style.color = running_states[getServerStatus(config.servers[i]).state].list_color;
    }
    if (document.getElementById("server_container").style.display == "block" && activeeditindex !== false) {
        document.getElementById("edit_server_running").querySelector(".label").innerHTML = running_states[getServerStatus(config.servers[activeeditindex]).state].text;
        document.getElementById("edit_server_running").querySelector(".label").style.color = running_states[getServerStatus(config.servers[activeeditindex]).state].edit_color;
        document.querySelector("#settings_server_list").innerHTML = getServerStatusBox(config.servers[activeeditindex]);
    }
}

function updateOnIpChange() {
    if (document.getElementById("server_container").style.display == "block" && activeeditindex !== false) {
        document.querySelector("#settings_server_list").innerHTML = getServerStatusBox(config.servers[activeeditindex]);
    }
}

function configsEqual(config1, config2) {
    if (JSON.stringify(Object.keys(config1).sort()) == JSON.stringify(Object.keys(config2).sort())) {
        for (var o = 0; o < Object.keys(config1).length; o++) {
            if (JSON.stringify(config1[Object.keys(config1)[o]]) !== JSON.stringify(config2[Object.keys(config1)[o]])) {
                return false;
            }
        }
        return true;
    } else {
        return false;
    }
}

function openSettings(dont_reset_scroll) {
    navigate("settings");
    if (config.background) {
        document.querySelector("#background").classList.add("checked");
    } else {
        document.querySelector("#background").classList.remove("checked");
    }
    if (config.updates == true) {
        document.querySelector("#updates").classList.add("checked");
    } else {
        document.querySelector("#updates").classList.remove("checked");
    }
    if (config.darkmode) {
        document.querySelector("#darkmode").classList.add("checked");
    } else {
        document.querySelector("#darkmode").classList.remove("checked");
    }
    if (dont_reset_scroll !== true) {
        document.querySelector("#settings_container").scrollTop = 0;
    }
}

var current_path = false;
var activeeditindex = false;

function addServer(editindex) {
    resetAllSections();
    
    last_gen_crypto_date = false;

    document.querySelector("#folder_path_error").style.display = "none";
    if (editindex != null) {
        document.querySelector("#edit_server_title").innerText = "Edit Server";
        document.querySelector("#submit_button").innerText = "Save Changes";
    } else {
        document.querySelector("#edit_server_title").innerText = "Add Server";
        document.querySelector("#submit_button").innerText = "Create Server";
    }
    activeeditindex = (editindex != null ? editindex : false);

    if (editindex != null) {
        document.getElementById("server_container_status").style.display = "block";
        if (config.servers[editindex].enabled) {
            document.getElementById("edit_server_running").classList.add("checked");
        } else {
            document.getElementById("edit_server_running").classList.remove("checked");
        }
        document.getElementById("edit_server_running").querySelector(".label").innerHTML = running_states[getServerStatus(config.servers[editindex]).state].text;
        document.getElementById("edit_server_running").querySelector(".label").style.color = running_states[getServerStatus(config.servers[editindex]).state].edit_color;
        document.querySelector("#settings_server_list").innerHTML = getServerStatusBox(config.servers[editindex]);

        current_path = config.servers[editindex].path;
        updateCurrentPath();
        document.querySelector("#port").value = config.servers[editindex].port;
        portChange();
        toggleCheckbox("localnetwork", config.servers[editindex].localnetwork != null ? config.servers[editindex].localnetwork : false);

        toggleCheckbox("showIndex", config.servers[editindex].showIndex != null ? config.servers[editindex].showIndex : true);
        toggleCheckbox("spa", config.servers[editindex].spa != null ? config.servers[editindex].spa : false);
        document.querySelector("#rewriteTo").value = config.servers[editindex].rewriteTo || "/index.html";
        toggleCheckbox("directoryListing", config.servers[editindex].directoryListing != null ? config.servers[editindex].directoryListing : true);
        toggleCheckbox("excludeDotHtml", config.servers[editindex].excludeDotHtml != null ? config.servers[editindex].excludeDotHtml : false);

        toggleCheckbox("ipv6", config.servers[editindex].ipv6 != null ? config.servers[editindex].ipv6 : false);
        document.querySelector("#cacheControl").value = config.servers[editindex].cacheControl || "";
        toggleCheckbox("hiddenDotFiles", config.servers[editindex].hiddenDotFiles != null ? config.servers[editindex].hiddenDotFiles : false);
        toggleCheckbox("cors", config.servers[editindex].cors != null ? config.servers[editindex].cors : false);
        toggleCheckbox("upload", config.servers[editindex].upload != null ? config.servers[editindex].upload : false);
        toggleCheckbox("replace", config.servers[editindex].replace != null ? config.servers[editindex].replace : false);
        toggleCheckbox("delete", config.servers[editindex].delete != null ? config.servers[editindex].delete : false);
        toggleCheckbox("staticDirectoryListing", config.servers[editindex].staticDirectoryListing != null ? config.servers[editindex].staticDirectoryListing : false);
        toggleCheckbox("hiddenDotFilesDirectoryListing", config.servers[editindex].hiddenDotFilesDirectoryListing != null ? config.servers[editindex].hiddenDotFilesDirectoryListing : true);
        toggleCheckbox("htaccess", config.servers[editindex].htaccess != null ? config.servers[editindex].htaccess : false);

        document.querySelector("#custom404").value = config.servers[editindex].custom404 || "";
        document.querySelector("#custom403").value = config.servers[editindex].custom403 || "";
        document.querySelector("#custom401").value = config.servers[editindex].custom401 || "";
        document.querySelector("#customErrorReplaceString").value = config.servers[editindex].customErrorReplaceString || "";

        toggleCheckbox("https", config.servers[editindex].https != null ? config.servers[editindex].https : false);
        document.querySelector("#httpsCert").value = config.servers[editindex].httpsCert ? config.servers[editindex].httpsCert.split("\r").join("\\r").split("\n").join("\\n") : "";
        document.querySelector("#httpsKey").value = config.servers[editindex].httpsKey ? config.servers[editindex].httpsKey.split("\r").join("\\r").split("\n").join("\\n") : "";
        toggleCheckbox("httpAuth", config.servers[editindex].httpAuth != null ? config.servers[editindex].httpAuth : false);
        document.querySelector("#httpAuthUsername").value = config.servers[editindex].httpAuthUsername || "";
        httpAuthUsernameChange();
        document.querySelector("#httpAuthPassword").value = config.servers[editindex].httpAuthPassword || "";
        document.querySelector("#ipThrottling").value = config.servers[editindex].ipThrottling || 10;
        ipLimitChange();

        document.querySelector("#delete_server_option").style.display = "block";
        document.querySelector("#submit_button").innerText = "Save Changes";
    } else {
        document.getElementById("server_container_status").style.display = "none";

        current_path = false;
        updateCurrentPath();

        var try_port = 8080;
        while ((config.servers || []).map(function(a) {return a.port}).indexOf(try_port) > -1 && try_port < 9000) {
            try_port++;
        }

        document.querySelector("#port").value = try_port;
        portChange();
        toggleCheckbox("localnetwork", false);

        toggleCheckbox("showIndex", true);
        toggleCheckbox("spa", false);
        document.querySelector("#rewriteTo").value = "/index.html";
        toggleCheckbox("directoryListing", true);
        toggleCheckbox("excludeDotHtml", false);

        toggleCheckbox("ipv6", false);
        document.querySelector("#cacheControl").value = "";
        toggleCheckbox("hiddenDotFiles", false);
        toggleCheckbox("cors", false);
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
        httpAuthUsernameChange();
        document.querySelector("#httpAuthPassword").value = "";
        document.querySelector("#ipThrottling").value = 10;
        ipLimitChange();

        document.querySelector("#delete_server_option").style.display = "none";
        document.querySelector("#submit_button").innerText = "Create Server";
    }

    navigate("server");
    document.getElementById("server_container").scrollTop = 0;
}

function cancelAddServer() {
    navigate("main");
}

function submitAddServer() {
    if (!current_path) {
        document.querySelector("#folder_path_label").scrollIntoView({behavior: "smooth"});
        document.querySelector("#folder_path_error").style.display = "block";
        return;
    }

    if (!portValid()) {
        document.querySelector("#port").parentElement.nextElementSibling.style.display = "block";
        document.querySelector("#port").previousElementSibling.scrollIntoView({behavior: "smooth"});
        return;
    }

    if (!portUnique()) {
        document.querySelector("#port").parentElement.nextElementSibling.nextElementSibling.style.display = "block";
        document.querySelector("#port").previousElementSibling.scrollIntoView({behavior: "smooth"});
        return;
    }

    if (!httpAuthUsernameValid()) {
        document.querySelector("#httpAuthUsername").parentElement.nextElementSibling.style.display = "block";
        if (!document.querySelector("#security_section").classList.contains("section_visible")) {
            toggleSection(document.querySelector("#security_section"))
            setTimeout(function() {document.querySelector("#httpAuthUsername").previousElementSibling.scrollIntoView({behavior: "smooth"});}, 210);
        } else {
            document.querySelector("#httpAuthUsername").previousElementSibling.scrollIntoView({behavior: "smooth"});
        }
        return;
    }

    if (!ipLimitValid()) {
        document.querySelector("#ipThrottling").parentElement.nextElementSibling.style.display = "block";
        if (!document.querySelector("#security_section").classList.contains("section_visible")) {
            toggleSection(document.querySelector("#security_section"))
            setTimeout(function() {document.querySelector("#ipThrottling").previousElementSibling.scrollIntoView({behavior: "smooth"});}, 210);
        } else {
            document.querySelector("#ipThrottling").previousElementSibling.scrollIntoView({behavior: "smooth"});
        }
        return;
    }

    var server_object = {
        "enabled": activeeditindex !== false ? config.servers[activeeditindex].enabled : true,
        "path": current_path,
        "port": Number(document.querySelector("#port").value),
        "localnetwork": isChecked("localnetwork"),

        "showIndex": isChecked("showIndex"),
        "spa": isChecked("spa"),
        "rewriteTo": document.querySelector("#rewriteTo").value,
        "directoryListing": isChecked("directoryListing"),
        "excludeDotHtml": isChecked("excludeDotHtml"),

        "ipv6": isChecked("ipv6"),
        "cacheControl": document.querySelector("#cacheControl").value,
        "hiddenDotFiles": isChecked("hiddenDotFiles"),
        "cors": isChecked("cors"),
        "upload": isChecked("upload"),
        "replace": isChecked("replace"),
        "delete": isChecked("delete"),
        "staticDirectoryListing": isChecked("staticDirectoryListing"),
        "hiddenDotFilesDirectoryListing": isChecked("hiddenDotFilesDirectoryListing"),
        "htaccess": isChecked("htaccess"),

        "custom404": document.querySelector("#custom404").value,
        "custom403": document.querySelector("#custom403").value,
        "custom401": document.querySelector("#custom401").value,
        "customErrorReplaceString": document.querySelector("#customErrorReplaceString").value,

        "https": isChecked("https"),
        "httpsCert": document.querySelector("#httpsCert").value.split("\\r").join("\r").split("\\n").join("\n"),
        "httpsKey": document.querySelector("#httpsKey").value.split("\\r").join("\r").split("\\n").join("\n"),
        "httpAuth": isChecked("httpAuth"),
        "httpAuthUsername": document.querySelector("#httpAuthUsername").value,
        "httpAuthPassword": document.querySelector("#httpAuthPassword").value,
        "ipThrottling": Number(document.querySelector("#ipThrottling").value),
    };
    if (activeeditindex !== false) {
        for (var i = 0; i < Object.keys(server_object).length; i++) {
            config.servers[activeeditindex][Object.keys(server_object)[i]] = server_object[Object.keys(server_object)[i]];
        }
    } else {
        if (!config.servers) {
            config.servers = [];
        }
        config.servers.push(server_object);
    }
    navigate("main");
    renderServerList();
    window.api.saveconfig(config);
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

function toggleServer(index,inedit) {
config.servers[index].enabled = !config.servers[index].enabled;
if (config.servers[index].enabled) {
    document.getElementById(inedit ? "edit_server_running" : "server_"+index).classList.add("checked")
} else {
    document.getElementById(inedit ? "edit_server_running" : "server_"+index).classList.remove("checked")
}
updateRunningStates();
window.api.saveconfig(config);
}

function toggleEditServerRunning() {
    toggleServer(activeeditindex,true);
}

function toggleRunInBk() {
if (config.background) {
    document.querySelector("#background").classList.remove("checked");
    document.querySelector("#background_welcome").classList.remove("checked");
    config.background = false;
} else {
    document.querySelector("#background").classList.add("checked");
    document.querySelector("#background_welcome").classList.add("checked");
    config.background = true
}
document.getElementById("stop_and_quit_button").style.display = config.background ? "block" : "none";
window.api.saveconfig(config);
}

function toggleUpdates() {
if (config.updates == true) {
    document.querySelector("#updates").classList.remove("checked");
    document.querySelector("#updates_welcome").classList.remove("checked");
    config.updates = false;
    document.getElementById("update_banner").style.display = "none";
} else {
    document.querySelector("#updates").classList.add("checked");
    document.querySelector("#updates_welcome").classList.add("checked");
    config.updates = true
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

function portValid() {
    return Number(document.querySelector("#port").value) >= 1 && Number(document.querySelector("#port").value) <= 65535;
}

function portUnique() {
    return (config.servers || []).map(function(a) {return a.port}).indexOf(Number(document.querySelector("#port").value)) == -1 || (activeeditindex !== false && (config.servers || []).map(function(a) {return a.port}).indexOf(Number(document.querySelector("#port").value)) == activeeditindex);
}

function portChange() {
    if (portValid()) {
        document.querySelector("#port").parentElement.nextElementSibling.style.display = "none";
    } else {
        document.querySelector("#port").parentElement.nextElementSibling.style.display = "block";
    }
    if (portUnique()) {
        document.querySelector("#port").parentElement.nextElementSibling.nextElementSibling.style.display = "none";
    } else {
        document.querySelector("#port").parentElement.nextElementSibling.nextElementSibling.style.display = "block";
    }
}

function ipLimitValid() {
    return Number(document.querySelector("#ipThrottling").value) >= 0;
}

function ipLimitChange() {
    if (ipLimitValid()) {
        document.querySelector("#ipThrottling").parentElement.nextElementSibling.style.display = "none";
    } else {
        document.querySelector("#ipThrottling").parentElement.nextElementSibling.style.display = "block";
    }
}

function httpAuthUsernameValid() {
    return document.querySelector("#httpAuthUsername").value.indexOf(":") == -1;
}

function httpAuthUsernameChange() {
    if (httpAuthUsernameValid()) {
        document.querySelector("#httpAuthUsername").parentElement.nextElementSibling.style.display = "none";
    } else {
        document.querySelector("#httpAuthUsername").parentElement.nextElementSibling.style.display = "block";
    }
}

function updateCurrentPath() {
    document.querySelector("#path").value = current_path ? current_path : "";
    document.querySelector("#folder_path_error").style.display = "none";
}

function chooseFolder() {
    window.api.showPicker(current_path).then(function(chosen_path) {
        if (chosen_path && chosen_path.length > 0) {current_path = chosen_path[0]};
        updateCurrentPath(); 
    })
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

var last_gen_crypto_date = false;

function generateCrypto() {
    start_gen_date = Date.now();
    last_gen_crypto_date = start_gen_date;
    document.getElementById("generate_crypto").classList.add("disabled");
    window.api.generateCrypto().then(function(crypto) {
        if (last_gen_crypto_date == start_gen_date) {
            document.getElementById("generate_crypto").classList.remove("disabled");
            if (document.getElementById("httpsCert").value.length > 0 || document.getElementById("httpsKey").value.length > 0) {
                showPrompt("Overwrite certificate and private key?", "A certificate and private key already exist. This action will overwrite them.", [["Confirm","destructive",function() {
                    document.getElementById("httpsCert").value = crypto.cert.split("\r").join("\\r").split("\n").join("\\n");
                    document.getElementById("httpsKey").value = crypto.privateKey.split("\r").join("\\r").split("\n").join("\\n");
                    hidePrompt();
                }],["Cancel","",function() {hidePrompt()}]])
            } else {
                console.log(crypto.cert);
                console.log(crypto.privateKey);
                document.getElementById("httpsCert").value = crypto.cert.split("\r").join("\\r").split("\n").join("\\n");
                document.getElementById("httpsKey").value = crypto.privateKey.split("\r").join("\\r").split("\n").join("\\n");
            }
        }
    });
}

function initWelcome() {
    config.background = false;
    config.updates = true;
    window.api.saveconfig(config);
    navigate("welcome");
}

function initContinue() {
    openMain();
}