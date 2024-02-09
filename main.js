let config = {};
let ip;
let server_states = [];
let running_states = {
    "stopped": {
        "text": lang.state_stopped,
        "list_color": "var(--status-gray)",
        "edit_color": "var(--text-primary)"
    },
    "starting": {
        "text": lang.state_starting,
        "list_color": "var(--status-gray)",
        "edit_color": "var(--text-primary)"
    },
    "running": {
        "text":  lang.state_running,
        "list_color": "var(--status-green)",
        "edit_color": "var(--status-green)"
    },
    "error": {
        "text": lang.state_error,
        "list_color": "var(--status-red)",
        "edit_color": "var(--status-red)"
    },
    "unknown": {
        "text": lang.state_starting,
        "list_color": "var(--status-gray)",
        "edit_color": "var(--text-primary)"
    },
}
let install_source;
let plugins;
let platform;
let ignore_update;

window.api.initipc((event, message) => {
    if (message.type === "init") {
        config = message.config;
        ip = message.ip;
        install_source = message.install_source;
        plugins = message.plugins;
        platform = message.platform;
        document.getElementById("version_number").innerText = message.version;
        if (config.background != null && config.updates != null) openMain();
        else initWelcome();
        document.getElementById("stop_and_quit_button").style.display = config.background ? "block" : "none";
        document.body.style.visibility = "visible";
        refreshPluginList();
        if (platform == "darwin" || platform == "win32") {
            if (platform == "darwin") {
                document.querySelector("#tray").setAttribute("aria-label", lang.setting_tray_macos);
                document.querySelector("#tray > .label").firstChild.textContent = lang.setting_tray_macos+" ";
            } else {
                document.querySelector("#tray").setAttribute("aria-label", lang.setting_tray_windows);
                document.querySelector("#tray > .label").firstChild.textContent = lang.setting_tray_windows+" ";
            }
        } else {
            document.querySelector("#tray").style.display = "none";
        }
    } else if (message.type === "state") {
        server_states = message.server_states;
        updateRunningStates();
    } else if (message.type === "update") {
        ignore_update = message.version;
        if (message.ignored !== true) {
            document.getElementById("update_banner").style.display = "block";
            document.getElementById("update_banner").href = message.url;
            document.getElementById("update_banner_text").innerText = message.text || lang.update_available;
            if (message.attributes.indexOf("high_priority") > -1) {
                document.getElementById("update_banner").classList.add("high_priority");
            } else {
                document.getElementById("update_banner").classList.remove("high_priority");
            }
        }
        document.getElementById("update_notice").style.display = "";
        document.getElementById("update_notice").querySelector("a").href = message.url;
    } else if (message.type === "ipchange") {
        ip = message.ip;
        updateOnIpChange();
    } else if (message.type == "pluginschange") {
        plugins = message.plugins;
        refreshPluginList();
        if (document.getElementById("server_container").style.display === "block") {
            location.reload();
        }
    } else if (message.type === "reload") {
        location.reload();
    }
});

function ignoreUpdate() {
    config.ignore_update = ignore_update;
    window.api.saveconfig(config);
    document.getElementById("update_banner").style.display = "none";
}

window.onresize = () => reevaluateSectionHeights();

let screens = ["main", "settings", "server", "licenses", "welcome"]
function navigate(screen) {
    for (let i=0; i<screens.length; i++) {
        if (document.getElementById(screens[i]+"_title")) {
            document.getElementById(screens[i]+"_title").style.display = (screens[i] === screen ? "block" : "none");
        }
        if (document.getElementById(screens[i]+"_container")) {
            document.getElementById(screens[i]+"_container").style.display = (screens[i] === screen ? "block" : "none");
        }
        if (document.getElementById(screens[i]+"_actions")) {
            document.getElementById(screens[i]+"_actions").style.display = (screens[i] === screen ? "block" : "none");
        }
    }
    // if (screen == "server") {
    //     dragHandler = function(path) {
    //         console.log(path);
    //     }
    // } else {
    //     delete dragHandler;
    // }
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

let loaded_licenses = false;

// This function isn't used anwhere...
async function openLicenses() {
    navigate("licenses");
    document.querySelector("#licenses_container").scrollTop = 0;
    if (loaded_licenses === true) return;
    const text = await fetch('open_source_licenses.txt').then(res => res.text());
    const text2 = await fetch('LICENSE').then(response => response.text())
    loaded_licenses = true;
    document.querySelector("#licenses_content").innerText = text2+"\n"+text;
}

function renderServerList() {
    let pendhtml = "";
    for (let i=0; i<(config.servers || []).length; i++) {
        pendhtml += '<div class="server '+(config.servers[i].enabled ? "checked" : "")+'" id="server_'+i+'" onmousedown="reorderDragStart(event, '+i+')" ontouchstart="reorderDragStart(event, '+i+')"><div tabindex="0" onclick="toggleServer('+i+')" role="switch" aria-label="'+lang.enabled_switch+'"><div class="switch"></div></div><div tabindex="0" onclick="if(!dragging){addServer('+i+')}"><div><span>'+htmlescape(config.servers[i].path)+'</span></div><div><span class="server_status" style="color: '+running_states[getServerStatus(config.servers[i]).state].list_color+';">'+running_states[getServerStatus(config.servers[i]).state].text+'</span> &bull; '+lang.option_port+' '+String(config.servers[i].port)+(config.servers[i].ipv6 ? ' &bull; '+lang.option_ipv6_abbreviation : '')+(config.servers[i].localnetwork ? ' &bull; '+lang.option_localnetwork_abbreviation : '')+(config.servers[i].https ? ' &bull; '+lang.option_https_abbreviation : '')+'</div></div></div>'
    }
    if (pendhtml === "") {
        pendhtml = '<div style="color: var(--fullscreen_placeholder);text-align: center;position: absolute;top: 48%;width: 100%;transform: translateY(-50%);"><i class="material-icons" aria-hidden="true" style="font-size: 70px;">dns</i><div style="font-size: 18px;padding-top: 20px;">'+lang.no_servers+'</div></div>';
    }
    document.getElementById("servers_list").innerHTML = pendhtml;
}

var drag_y_start;
var dragging = false;
var dragging_index;
var last_hover_index;

function reorderDragStart(event, index) {

    drag_y_start = (event.pageY || event.targetTouches[0].pageY);
    dragging_index = index;

    document.documentElement.addEventListener('touchmove', reorderDragMove);
    document.documentElement.addEventListener('mousemove', reorderDragMove);
    document.documentElement.addEventListener('touchend', reorderDragEnd);
    document.documentElement.addEventListener('touchcancel', reorderDragEnd);
    document.documentElement.addEventListener('mouseup', reorderDragEnd);

}

function reorderDragMove(event) {

    let drag_y = (event.pageY || event.targetTouches[0].pageY);
    let offset = drag_y-drag_y_start;

    if (!dragging && Math.abs(offset) > 1) {
        dragging = true;
        document.querySelector("#server_"+dragging_index).classList.add("in_drag");
        document.querySelector("#server_"+dragging_index).insertAdjacentHTML("afterend", '<div class="server_placeholder"></div>');
        document.body.style.pointerEvents = "none";
        document.body.style.overflowAnchor = "none";
        document.querySelector("#main_container").style.overflowY = "hidden";
    }

    if (dragging) {
        let top = ((81*dragging_index)+offset);
        document.querySelector("#server_"+dragging_index).style.top = (top < 0 ? top/3 : (top > ((config.servers || []).length-1)*81 ? ((config.servers || []).length-1)*81 + (top-(((config.servers || []).length-1)*81))/3 : top))+"px";

        let hover_index_offset = Math.floor((offset + 40)/81);
        last_hover_index = Math.max(0, Math.min((config.servers || []).length-1, dragging_index + hover_index_offset));

        for (let i=0; i<(config.servers || []).length; i++) {
            if (i >= last_hover_index && dragging_index > i) {
                document.querySelector("#server_"+i).style.transform = "translateY(81px)";
            } else if (i <= last_hover_index && dragging_index < i) {
                document.querySelector("#server_"+i).style.transform = "translateY(-81px)";
            } else {
                document.querySelector("#server_"+i).style.transform = "translateY(0px)";
            }
        }

    }

}

function reorderDragEnd() {

    document.documentElement.removeEventListener('touchmove', reorderDragMove);
    document.documentElement.removeEventListener('mousemove', reorderDragMove);
    document.documentElement.removeEventListener('touchend', reorderDragEnd);
    document.documentElement.removeEventListener('touchcancel', reorderDragEnd);
    document.documentElement.removeEventListener('mouseup', reorderDragEnd);

    if (dragging) {
        dragging = false;

        let new_top = last_hover_index*81;
        let old_top = Number(document.querySelector("#server_"+dragging_index).style.top.split("px")[0]);

        document.querySelector("#server_"+dragging_index).style.transform = "translateY("+(new_top-old_top)+"px)";
        document.querySelector("#server_"+dragging_index).classList.add("in_drag_ending");

        document.querySelector("#server_"+dragging_index).addEventListener('transitionend', () => {
            document.querySelector("#server_"+dragging_index).classList.remove("in_drag");
            document.querySelector("#server_"+dragging_index).classList.remove("in_drag_ending");
            document.querySelector(".server_placeholder").outerHTML = "";
            document.body.style.pointerEvents = "";
            document.body.style.overflowAnchor = "";
            document.querySelector("#main_container").style.overflowY = "";

            var temp = config.servers[dragging_index];
            config.servers.splice(dragging_index, 1);
            config.servers.splice(last_hover_index, 0, temp);

            window.api.saveconfig(config);

            renderServerList();
        });
    }
}

function getServerStatus(local_config) {
    if (!local_config.enabled) return {"state": "stopped"};
    for (let i=0; i<server_states.length; i++) {
        if (configsEqual(server_states[i].config, local_config)) {
            return {"state": server_states[i].state, "error_message": server_states[i].error_message}
        }
    }
    return {"state": "unknown"};
}

function getServerStatusBox(local_config) {
    if (!local_config.enabled) return '';
    if (getServerStatus(local_config).state === "running") {

        let url_list = [];

        for (let i=0; i<ip.length; i++) {
            if ((ip[i][0] === '127.0.0.1' && local_config.ipv6 !== true) || (ip[i][0] === '::1' && local_config.ipv6 === true) || (local_config.localnetwork && ((ip[i][1] === "ipv4") || (ip[i][1] === "ipv6" && local_config.ipv6 === true)))) {
                url_list.push((local_config.https ? 'https' : 'http')+'://'+(ip[i][1] === "ipv6" ? "["+ip[i][0]+"]" : ip[i][0])+':'+local_config.port);
            }
        }

        return '<div class="status_box"><div>'+lang.web_server_url+(url_list.length === 1 ? '' : 's')+'</div><div>'+url_list.map((a) => {return '<a href="'+a+'" target="_blank" onclick="window.api.openExternal(this.href);event.preventDefault()">'+a+'</a>'}).join('<div style="padding-top: 6px;"></div>')+"</div></div>";

    } else if (getServerStatus(local_config).state === "error") {
        let error_message = getServerStatus(local_config).error_message;
        if (error_message.indexOf("EADDRINUSE") > -1) {
            return '<div class="status_box error_status_box"><div>'+lang.error_port_in_use+'</div><div>'+lang.error_port_in_use_description.replace("[PORT]", local_config.port)+'</div></div>';
        } else if (error_message.indexOf("FILESYSTEMERROR-") == 0) {
            return '<div class="status_box error_status_box"><div>'+lang.error_file_system+'</div><div>'+htmlescape(error_message.substring("FILESYSTEMERROR-".length))+'</div></div>';
        } else if (error_message.indexOf("PLUGINERROR-") == 0) {
            return '<div class="status_box error_status_box"><div>'+lang.error_plugins+'</div><div>'+htmlescape(error_message.substring("PLUGINERROR-".length))+'</div></div>';
        } else {
            return '<div class="status_box error_status_box"><div>'+lang.error_generic+'</div><div>'+htmlescape(error_message)+'</div></div>';
        }
    } else return '';
}

function updateRunningStates() {
    for (let i=0; i<(config.servers || []).length; i++) {
        document.getElementById("server_"+i).querySelector(".server_status").innerHTML = running_states[getServerStatus(config.servers[i]).state].text;
        document.getElementById("server_"+i).querySelector(".server_status").style.color = running_states[getServerStatus(config.servers[i]).state].list_color;
    }
    if (document.getElementById("server_container").style.display === "block" && activeeditindex !== false) {
        document.getElementById("edit_server_running").querySelector(".label").innerHTML = running_states[getServerStatus(config.servers[activeeditindex]).state].text;
        document.getElementById("edit_server_running").querySelector(".label").style.color = running_states[getServerStatus(config.servers[activeeditindex]).state].edit_color;
        document.querySelector("#settings_server_list").innerHTML = getServerStatusBox(config.servers[activeeditindex]);
    }
}

function updateOnIpChange() {
    if (document.getElementById("server_container").style.display === "block" && activeeditindex !== false) {
        document.querySelector("#settings_server_list").innerHTML = getServerStatusBox(config.servers[activeeditindex]);
    }
}

function configsEqual(config1, config2) {
    if (JSON.stringify(Object.keys(config1).sort()) !== JSON.stringify(Object.keys(config2).sort())) return false;
    for (let o=0; o<Object.keys(config1).length; o++) {
        if (JSON.stringify(config1[Object.keys(config1)[o]]) !== JSON.stringify(config2[Object.keys(config1)[o]])) return false;
    }
    return true;
}

function openSettings(dont_reset_scroll) {
    navigate("settings");
    if (config.background) {
        document.querySelector("#background").classList.add("checked");
        document.querySelector("#background").setAttribute("aria-checked", "true");
    } else {
        document.querySelector("#background").classList.remove("checked");
        document.querySelector("#background").setAttribute("aria-checked", "false");
    }
    if (config.tray) {
        document.querySelector("#tray").classList.add("checked");
        document.querySelector("#tray").setAttribute("aria-checked", "true");
    } else {
        document.querySelector("#tray").classList.remove("checked");
        document.querySelector("#tray").setAttribute("aria-checked", "false");
    }
    if (config.updates === true) {
        document.querySelector("#updates").classList.add("checked");
        document.querySelector("#updates").setAttribute("aria-checked", "true");
    } else {
        document.querySelector("#updates").classList.remove("checked");
        document.querySelector("#updates").setAttribute("aria-checked", "false");
    }
    if (install_source === "macappstore") {
        document.querySelector("#updates").style.display = "none";
    }
    document.querySelector("#theme").value = config.theme || "system";
    if (dont_reset_scroll !== true) {
        document.querySelector("#settings_container").scrollTop = 0;
    }
}

let current_path = false;
let activeeditindex = false;

function addServer(editindex) {
    resetAllSections();

    last_gen_crypto_date = false;

    document.querySelector("#folder_path_error").style.display = "none";
    if (editindex != null) {
        document.querySelector("#edit_server_title").innerText = lang.edit_server;
        document.querySelector("#submit_button").innerText = lang.save_changes;
        document.querySelector("#submit_button").setAttribute("aria-label", lang.save_changes);
    } else {
        document.querySelector("#edit_server_title").innerText = lang.add_server;
        document.querySelector("#submit_button").innerText = lang.create_server;
        document.querySelector("#submit_button").setAttribute("aria-label", lang.create_server);
    }
    activeeditindex = (editindex != null ? editindex : false);

    if (editindex != null) {
        document.getElementById("server_container_status").style.display = "block";
        if (config.servers[editindex].enabled) {
            document.getElementById("edit_server_running").classList.add("checked");
            document.getElementById("edit_server_running").setAttribute("aria-checked", "true");
        } else {
            document.getElementById("edit_server_running").classList.remove("checked");
            document.getElementById("edit_server_running").setAttribute("aria-checked", "false");
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
        toggleCheckbox("precompression", config.servers[editindex].precompression != null ? config.servers[editindex].precompression : false);
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
        httpAuthPasswordChange();
        document.querySelector("#ipThrottling").value = config.servers[editindex].ipThrottling || 10;
        ipLimitChange();

        document.querySelector("#delete_server_option").style.display = "block";
        document.querySelector("#submit_button").innerText = lang.save_changes;
        document.querySelector("#submit_button").setAttribute("aria-label", lang.save_changes);
    } else {
        document.getElementById("server_container_status").style.display = "none";

        current_path = false;
        updateCurrentPath();

        let try_port = 8080;
        while ((config.servers || []).map(a=>{return a.port}).indexOf(try_port) > -1 && try_port < 9000) {
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
        toggleCheckbox("precompression", false);
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
        httpAuthPasswordChange();
        document.querySelector("#ipThrottling").value = 10;
        ipLimitChange();

        document.querySelector("#delete_server_option").style.display = "none";
        document.querySelector("#submit_button").innerText = lang.create_server;
        document.querySelector("#submit_button").setAttribute("aria-label", lang.create_server);
    }

    renderPluginOptions(editindex != null ? config.servers[editindex] : null);

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
            setTimeout(()=>document.querySelector("#httpAuthUsername").previousElementSibling.scrollIntoView({behavior: "smooth"}), 210);
        } else {
            document.querySelector("#httpAuthUsername").previousElementSibling.scrollIntoView({behavior: "smooth"});
        }
        return;
    }

    if (!httpAuthPasswordValid()) {
        document.querySelector("#httpAuthPassword").parentElement.nextElementSibling.style.display = "block";
        if (!document.querySelector("#security_section").classList.contains("section_visible")) {
            toggleSection(document.querySelector("#security_section"))
            setTimeout(()=>document.querySelector("#httpAuthPassword").previousElementSibling.scrollIntoView({behavior: "smooth"}), 210);
        } else {
            document.querySelector("#httpAuthPassword").previousElementSibling.scrollIntoView({behavior: "smooth"});
        }
        return;
    }

    if (!ipLimitValid()) {
        document.querySelector("#ipThrottling").parentElement.nextElementSibling.style.display = "block";
        if (!document.querySelector("#security_section").classList.contains("section_visible")) {
            toggleSection(document.querySelector("#security_section"))
            setTimeout(()=>document.querySelector("#ipThrottling").previousElementSibling.scrollIntoView({behavior: "smooth"}), 210);
        } else {
            document.querySelector("#ipThrottling").previousElementSibling.scrollIntoView({behavior: "smooth"});
        }
        return;
    }

    let server_object = {
        "enabled": activeeditindex !== false ? config.servers[activeeditindex].enabled : true,
        "path": current_path,
        "port": Math.floor(Number(document.querySelector("#port").value)),
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
        "precompression": isChecked("precompression"),
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
        "ipThrottling": Math.floor(Number(document.querySelector("#ipThrottling").value)),
    };

    server_object.plugins = savePluginOptions();

    if (activeeditindex !== false) {
        for (let i=0; i<Object.keys(server_object).length; i++) {
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

let pend_delete_server_id = false;

function confirmDeleteServer() {
    config.servers.splice(pend_delete_server_id, 1);
    navigate("main");
    renderServerList();
    window.api.saveconfig(config);
    hidePrompt();
}

function deleteServer() {
    pend_delete_server_id = activeeditindex;
    showPrompt(lang.delete_server_confirm, lang.delete_server_confirm_description, [[lang.prompt_confirm,"destructive",confirmDeleteServer],[lang.cancel,"",hidePrompt]])
}

function toggleServer(index,inedit) {
    config.servers[index].enabled = !config.servers[index].enabled;
    if (config.servers[index].enabled) {
        document.getElementById(inedit ? "edit_server_running" : "server_"+index).classList.add("checked")
        if (inedit) {
            document.getElementById("edit_server_running").setAttribute("aria-checked", "true");
        } else {
            document.getElementById("server_"+index).querySelector('[role="switch"]').setAttribute("aria-checked", "true");
        }
    } else {
        document.getElementById(inedit ? "edit_server_running" : "server_"+index).classList.remove("checked")
        if (inedit) {
            document.getElementById("edit_server_running").setAttribute("aria-checked", "false");
        } else {
            document.getElementById("server_"+index).querySelector('[role="switch"]').setAttribute("aria-checked", "false");
        }
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
        document.querySelector("#background").setAttribute("aria-checked", "false");
        document.querySelector("#background_welcome").classList.remove("checked");
        document.querySelector("#background_welcome").setAttribute("aria-checked", "false");
        config.background = false;
    } else {
        document.querySelector("#background").classList.add("checked");
        document.querySelector("#background").setAttribute("aria-checked", "true");
        document.querySelector("#background_welcome").classList.add("checked");
        document.querySelector("#background_welcome").setAttribute("aria-checked", "true");
        config.background = true;
    }
    document.getElementById("stop_and_quit_button").style.display = config.background ? "block" : "none";
    window.api.saveconfig(config);
}

function toggleUpdates() {
    if (config.updates === true) {
        document.querySelector("#updates").classList.remove("checked");
        document.querySelector("#updates").setAttribute("aria-checked", "false");
        document.querySelector("#updates_welcome").classList.remove("checked");
        document.querySelector("#updates_welcome").setAttribute("aria-checked", "false");
        config.updates = false;
        document.getElementById("update_banner").style.display = "none";
        document.getElementById("update_notice").style.display = "none";
    } else {
        document.querySelector("#updates").classList.add("checked");
        document.querySelector("#updates").setAttribute("aria-checked", "true");
        document.querySelector("#updates_welcome").classList.add("checked");
        document.querySelector("#updates_welcome").setAttribute("aria-checked", "true");
        config.updates = true
        delete config.ignore_update;
    }
    window.api.saveconfig(config);
}

function toggleTray() {
    if (config.tray === true) {
        document.querySelector("#tray").classList.remove("checked");
        document.querySelector("#tray").setAttribute("aria-checked", "false");
        config.tray = false;
    } else {
        document.querySelector("#tray").classList.add("checked");
        document.querySelector("#tray").setAttribute("aria-checked", "true");
        config.tray = true
    }
    window.api.saveconfig(config);
}

function themeChange() {
    config.theme = document.querySelector("#theme").value;
    window.api.saveconfig(config);
}

function changeLang() {
    config.language = document.querySelector("#language").value;
    window.api.saveconfig(config, true);
}

function portValid() {
    return Math.floor(Number(document.querySelector("#port").value)) >= 1 && Math.floor(Number(document.querySelector("#port").value)) <= 65535;
}

function portUnique() {
    return (config.servers || []).map(function(a) {return a.port}).indexOf(Math.floor(Number(document.querySelector("#port").value))) === -1 || (activeeditindex !== false && (config.servers || []).map(function(a) {return a.port}).indexOf(Math.floor(Number(document.querySelector("#port").value))) === activeeditindex);
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

function stringContainsControlCharacters(str) {
    const controlCharacterPattern = /[\x00-\x1F\x7F]/;
    return controlCharacterPattern.test(str);
  }

function httpAuthUsernameValid() {
    return document.querySelector("#httpAuthUsername").value.indexOf(":") === -1 && !stringContainsControlCharacters(document.querySelector("#httpAuthUsername").value);
}

function httpAuthUsernameChange() {
    if (httpAuthUsernameValid()) {
        document.querySelector("#httpAuthUsername").parentElement.nextElementSibling.style.display = "none";
    } else {
        document.querySelector("#httpAuthUsername").parentElement.nextElementSibling.style.display = "block";
    }
}

function httpAuthPasswordValid() {
    return !stringContainsControlCharacters(document.querySelector("#httpAuthPassword").value);
}

function httpAuthPasswordChange() {
    if (httpAuthPasswordValid()) {
        document.querySelector("#httpAuthPassword").parentElement.nextElementSibling.style.display = "none";
    } else {
        document.querySelector("#httpAuthPassword").parentElement.nextElementSibling.style.display = "block";
    }
}

function updateCurrentPath() {
    if (current_path) {
        document.querySelector("#path > div > span").innerText = current_path;
        document.querySelector("#path > div > span").parentElement.setAttribute("aria-label", current_path+", "+lang.choose_folder);
    } else {
        document.querySelector("#path > div > span").innerHTML = '<span style="color: var(--text-secondary);">'+lang.choose_folder+'</span>';
        document.querySelector("#path > div > span").parentElement.setAttribute("aria-label", lang.choose_folder);
    }
    document.querySelector("#folder_path_error").style.display = "none";
}

function chooseFolder() {
    window.api.showPicker(current_path).then(function(chosen_path) {
        if (chosen_path && chosen_path.length > 0) current_path = chosen_path[0];
        updateCurrentPath(); 
    })
}

function htmlescape(str) {
    if (str === undefined) {
        return str;
    }
    str = String(str);
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function urlescape(str) {
    if (str == undefined) {
        return str;
    }
    str = String(str);
    return str.replace(/"/g, "&quot;");
}

function showPrompt(title, content, buttons) {
    document.getElementById("prompt_bk").style.pointerEvents = "";
    document.getElementById("prompt").classList.add("prompt_show");
    document.getElementById("prompt").showModal();
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
        document.getElementById("prompt_actions").innerHTML = buttons.map(a=>{return '<div tabindex="0" role="button" aria-label="'+a[0]+'" class="button ' + a[1] + '" style="margin-left: 10px;" onclick="' + (typeof a[2] === "string" ? a[2] : "") + '"><span>' + a[0] + '</span></div>'}).join("");;
        for (let i=0; i<buttons.length; i++) {
            if (typeof buttons[i][2] !== "function") continue;
            document.getElementById("prompt_actions").children[i].onclick = buttons[i][2];
        }
    } else {
        document.getElementById("prompt_actions").style.display = "none";
    }
}

window.onclick = function(event) {
    if (event.target == document.getElementById("prompt")) {
        hidePrompt();
    }
}

function promptClose() {
    document.getElementById("prompt").classList.add("prompt_hide");
    document.getElementById("prompt").classList.remove("prompt_show");
    document.getElementById("prompt_bk").classList.remove("active");
}

function hidePrompt() {
    document.getElementById("prompt").classList.add("prompt_hide");
    document.getElementById("prompt").classList.remove("prompt_show");
    document.getElementById("prompt_bk").classList.remove("active");
    setTimeout(function() {
        if (document.getElementById("prompt").classList.contains("prompt_hide")) {
            document.getElementById("prompt").close();
        }
    }, 200);
}

function toggleCheckbox(element_or_id, toggled) {
    element_or_id = typeof element_or_id === "string" ? document.getElementById(element_or_id) : element_or_id;
    toggled = toggled == null ? !element_or_id.classList.contains("checked") : toggled;
    if (toggled) {
        element_or_id.classList.add("checked");
        element_or_id.setAttribute("aria-checked", "true");
        element_or_id.querySelector(".checkbox i").innerText = "check_box";
    } else {
        element_or_id.classList.remove("checked");
        element_or_id.setAttribute("aria-checked", "false");
        element_or_id.querySelector(".checkbox i").innerText = "check_box_outline_blank";
    }
}

function isChecked(element_or_id) {
    element_or_id = typeof element_or_id === "string" ? document.getElementById(element_or_id) : element_or_id;
    return element_or_id.classList.contains("checked");
}

function resetAllSections() {
    let sections = document.querySelectorAll(".settings_section_header");
    for (let i=0; i<sections.length; i++) {
        if (sections[i].classList.contains("section_visible")) {
            toggleSection(sections[i]);
        }
    }
}

function toggleSection(element) {
    if (element.classList.contains("section_visible")) {
        element.nextElementSibling.setAttribute("inert", "");
        element.classList.remove("section_visible");
        element.nextElementSibling.style.height = "";
        element.nextElementSibling.classList.remove("section_content_visible");
    } else {
        if (!element.classList.contains("plugin_nooptions")) {
            element.nextElementSibling.removeAttribute("inert");
            element.classList.add("section_visible");
            element.nextElementSibling.style.height = element.nextElementSibling.children[0].clientHeight+"px";
            element.nextElementSibling.classList.add("section_content_visible");
        }
    }
}

function reevaluateSectionHeights() {
    let sections = document.querySelectorAll(".settings_section_header");
    for (let i=0; i<sections.length; i++) {
        if (sections[i].classList.contains("section_visible")) {
            sections[i].nextElementSibling.style.height = sections[i].nextElementSibling.children[0].clientHeight+"px";
        }
    }
}

let last_gen_crypto_date = false;

function generateCrypto() {
    start_gen_date = Date.now();
    last_gen_crypto_date = start_gen_date;
    document.getElementById("generate_crypto").classList.add("disabled");
    window.api.generateCrypto().then(function(crypto) {
        if (last_gen_crypto_date === start_gen_date) {
            document.getElementById("generate_crypto").classList.remove("disabled");
            if (document.getElementById("httpsCert").value.length > 0 || document.getElementById("httpsKey").value.length > 0) {
                showPrompt(lang.generate_crypto_overwrite, lang.generate_crypto_overwrite_description, [[lang.prompt_confirm,"destructive",function() {
                    document.getElementById("httpsCert").value = crypto.cert.split("\r").join("\\r").split("\n").join("\\n");
                    document.getElementById("httpsKey").value = crypto.privateKey.split("\r").join("\\r").split("\n").join("\\n");
                    hidePrompt();
                }],[lang.cancel,"",function() {hidePrompt()}]])
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
    config.theme = "system";
    window.api.saveconfig(config);
    navigate("welcome");
    if (install_source === "macappstore") {
        document.querySelector("#updates_welcome").style.display = "none";
    }
}

function initContinue() {
    openMain();
}

function helpInfo(event, id, type) {
    event.preventDefault();
    event.stopPropagation();

    showPrompt((id.indexOf("plugin.") == 0 ? htmlescape(plugin_help_text[id.substring(7)][0]) : lang[type+"_"+id]), (id.indexOf("plugin.") == 0 ? plugin_help_text[id.substring(7)][1] : lang[type+"_"+id+"_description"]).replace(/<a href=["'](.+?)["']>/g, function(a, b) {return '<a href="'+b+'" target="_blank" onclick="window.api.openExternal(this.href);event.preventDefault()">'}), [[lang.prompt_done,"",hidePrompt]]);
}

// TODO: Implement drag and drop for setting the folder directory or installing a plugin. I don't know how to make this work with security scoped bookmarks on macOS.
var outstanding_drag_enter_events = 0;
var dragHandler = undefined;

function dragEnter(event) {
    if (dragHandler) {
        event.preventDefault();
        outstanding_drag_enter_events++;
        dragStarted();
    }
}

function dragLeave(event) {
    event.preventDefault();
    outstanding_drag_enter_events = Math.max(0, outstanding_drag_enter_events - 1);
    if (outstanding_drag_enter_events == 0) {
        dragEnded();
    }
}

function dragOver(event) {
    event.preventDefault();
}

function dragStarted() {
    document.querySelector("#drop_zone").classList.add("drag_hovering");
}

function dragEnded() {
    document.querySelector("#drop_zone").classList.remove("drag_hovering");
}

function dragDrop(event) {
    event.preventDefault();
    outstanding_drag_enter_events = 0;
    dragEnded();
    if (dragHandler && event.dataTransfer.files && event.dataTransfer.files[0]) {
        dragHandler(event.dataTransfer.files[0].path);
    }
}

function addPlugin(select_type) {
    if (select_type) {
        hidePrompt();
        doShowPicker();
    } else {
        if (platform !== "darwin") {
            showPrompt(lang.add_plugin, '<div style="padding: 8px 0px;overflow: hidden;"><div tabindex="0" class="button left" onclick="addPlugin(\'folder\')" role="button" aria-label="'+lang.plugin_choose_folder+'">'+lang.plugin_choose_folder+'</div></div><div style="padding: 8px 0px;overflow: hidden;padding-bottom: 0px;margin-bottom: -12px;"><div tabindex="0" class="button left" onclick="addPlugin(\'zip\')" role="button" aria-label="'+lang.plugin_choose_zip+'">'+lang.plugin_choose_zip+'</div></div>', []);
        } else {
            doShowPicker();
        }
    }

    function doShowPicker() {
        window.api.showPickerForPlugin(select_type).then(function(chosen_path) {
            if (chosen_path && chosen_path.length > 0) {
                window.api.checkPlugin(chosen_path[0]).then(function(manifest) {
                    if (manifest) {
                        showPrompt(lang.add_plugin_confirm.replace("[NAME]",htmlescape(manifest.name.substring(0,32))), lang.add_plugin_confirm_description, [[lang.prompt_confirm,"destructive",function() {
                            if (window.api.addPlugin(chosen_path[0])) {
                                hidePrompt();
                            } else {
                                showPrompt(lang.add_plugin_failed, lang.add_plugin_failed_description, [[lang.prompt_done,"",hidePrompt]]);
                            }
                        }],[lang.cancel,"",hidePrompt]]);
                    } else {
                        showPrompt(lang.add_plugin_invalid, lang.add_plugin_failed_description, [[lang.prompt_done,"",hidePrompt]]);
                    }
                })

            }
        })
    }
}

window.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        document.activeElement.click();
    }
});

function refreshPluginList() {
    if (Object.keys(plugins).length > 0) {
        document.querySelector("#plugins_list").innerHTML = Object.values(plugins).map(function(a) {return '<div><div><div>'+a.name+'</div><div>'+a.id+'</div></div><div onclick="removePlugin(\''+a.id+'\')" tabindex="0" aria-label="'+lang.remove_plugin+'" role="button"><i class="material-icons" aria-hidden="true">delete</i></div></div>'}).join("");
        document.querySelector("#plugins_list").style.display = "block";
    } else {
        document.querySelector("#plugins_list").style.display = "none";
    }
}

function removePlugin(pluginid) {
    if (plugins[pluginid]) {
        showPrompt(lang.remove_plugin_confirm.replace("[NAME]", htmlescape(plugins[pluginid].name.substring(0,32))), lang.remove_plugin_confirm_description, [[lang.prompt_confirm,"destructive",function() {
            window.api.removePlugin(pluginid);

            // Remove plugin options from all servers
            for (let i=0; i<(config.servers || []).length; i++) { 
                if (config.servers[i].plugins && config.servers[i].plugins[pluginid]) {
                    delete config.servers[i].plugins[pluginid];
                }
                if (config.servers[i].plugins && Object.keys(config.servers[i].plugins).length == 0) {
                    delete config.servers[i].plugins;
                }
            }

            window.api.saveconfig(config);

            hidePrompt();
        }],[lang.cancel,"",hidePrompt]])
    }
}

var plugin_help_text = {};

function renderPluginOptions(server_config) {
    let pendhtml = "";

    function drawOption(pluginid, option, plugin_options) {
        let option_value = plugin_options[option.id] != null ? ((typeof plugin_options[option.id] == typeof option.default) ? plugin_options[option.id] : option.default) : option.default;

        if (option.description) {
            plugin_help_text[pluginid+'.'+option.id] = [option.name, option.description];
        }

        if (option.type == "bool") {
            return '<div tabindex="0" class="checkbox_option'+(option_value ? " checked" : "")+'" id="plugin.'+pluginid+'.'+option.id+'" onclick="toggleCheckbox(this)" role="checkbox" aria-label="'+urlescape(option.name)+'" aria-checked="'+(option_value ? "true" : "false")+'"><div class="checkbox"><i class="material-icons" aria-hidden="true">'+(option_value ? "check_box" : "check_box_outline_blank")+'</i></div><div class="label">'+htmlescape(option.name)+(option.description ? ' <a href="#" class="help_icon" aria-label="'+lang.help+'" onclick="helpInfo(event, \'plugin.'+pluginid+'.'+option.id+'\', \'option\')"><i class="material-icons" aria-hidden="true">help_outline</i></a>' : '')+'</div></div>';
        } else if (option.type == "string") {
            return '<div class="input_option"><div class="label">'+htmlescape(option.name)+(option.description ? ' <a href="#" class="help_icon" aria-label="'+lang.help+'" onclick="helpInfo(event, \'plugin.'+pluginid+'.'+option.id+'\', \'option\')"><i class="material-icons" aria-hidden="true">help_outline</i></a>' : '')+'</div><input type="text" id="plugin.'+pluginid+'.'+option.id+'" placeholder="" value="'+urlescape(option_value)+'" aria-label="'+urlescape(option.name)+'"></div>';
        } else if (option.type == "number") {
            return '<div class="input_option"><div class="label">'+htmlescape(option.name)+(option.description ? ' <a href="#" class="help_icon" aria-label="'+lang.help+'" onclick="helpInfo(event, \'plugin.'+pluginid+'.'+option.id+'\', \'option\')"><i class="material-icons" aria-hidden="true">help_outline</i></a>' : '')+'</div><input type="number" step="1" id="plugin.'+pluginid+'.'+option.id+'" placeholder="" style="width: 100px;" '+(option.min != null ? 'min="'+option.min+'" ' : '')+''+(option.max != null ? 'max="'+option.max+'" ' : '')+'value="'+String(option_value || 0)+'" aria-label="'+urlescape(option.name)+'"></div>';
        } else if (option.type == "select") {
            return '<div class="input_option"><div class="label">'+htmlescape(option.name)+(option.description ? ' <a href="#" class="help_icon" aria-label="'+lang.help+'" onclick="helpInfo(event, \'plugin.'+pluginid+'.'+option.id+'\', \'option\')"><i class="material-icons" aria-hidden="true">help_outline</i></a>' : '')+'</div><select id="plugin.'+pluginid+'.'+option.id+'" aria-label="'+urlescape(option.name)+'">'+option.choices.map(a => '<option value="'+a.id+'"'+(option_value == a.id ? ' selected' : '')+'>'+htmlescape(a.name)+'</option>').join("")+'</select></div>';
        }
    }

    for (let i=0; i<Object.keys(plugins).length; i++) {
        let manifest = plugins[Object.keys(plugins)[i]];
        let plugin_options = (server_config && server_config.plugins && server_config.plugins[manifest.id]) ? server_config.plugins[manifest.id] : {};

        pendhtml += '<div tabindex="0" class="settings_section_header plugin_section'+(plugin_options.enabled ? " plugin_enabled" : "")+(((manifest.options || []).length > 0) ? "" : " plugin_nooptions")+'" onclick="toggleSection(this)" id="plugin.'+manifest.id+'" role="button" aria-label="'+urlescape(manifest.name)+'"><div role="checkbox" tabindex="0" aria-label="'+lang.enabled_switch+'" aria-checked="'+(plugin_options.enabled ? "true" : "false")+'" onclick="togglePlugin(event, this)"><i class="material-icons" aria-hidden="true">'+(plugin_options.enabled ? "check_box" : "check_box_outline_blank")+'</i></div><div>'+htmlescape(manifest.name)+'</div>'+(((manifest.options || []).length > 0) ? '<div><i class="material-icons" aria-hidden="true">expand_more</i></div>' : '')+'</div><div class="settings_section" inert><div class="settings_section_inner"'+(plugin_options.enabled ? "" : " inert")+'>'+(manifest.options || []).map(option => drawOption(manifest.id, option, plugin_options)).join("")+'</div></div>';
    }

    document.querySelector("#plugin_options").innerHTML = pendhtml;
}

function togglePlugin(event, element) {
    event.preventDefault();
    event.stopPropagation();

    let section = element.closest(".settings_section_header");
    if (section.classList.contains("plugin_enabled")) {
        section.classList.remove("plugin_enabled");
        section.setAttribute("aria-checked", "false");
        section.querySelector("div > i").innerText = "check_box_outline_blank";
        section.nextElementSibling.querySelector(".settings_section_inner").setAttribute("inert", "");
    } else {
        section.classList.add("plugin_enabled");
        section.setAttribute("aria-checked", "true");
        section.querySelector("div > i").innerText = "check_box";
        section.nextElementSibling.querySelector(".settings_section_inner").removeAttribute("inert");
    }
}

function savePluginOptions() {

    var plugin_options = {};

    for (let i=0; i<Object.keys(plugins).length; i++) {
        let manifest = plugins[Object.keys(plugins)[i]];

        plugin_options[manifest.id] = {
            "enabled": document.querySelector("#plugin\\."+manifest.id).classList.contains("plugin_enabled")
        }

        for (let e=0; e<(manifest.options || []).length; e++) {
            let option = manifest.options[e];
            
            if (option.type == "bool") {
                plugin_options[manifest.id][option.id] = document.querySelector("#plugin\\."+manifest.id+"\\."+option.id).classList.contains("checked");
            } else if (option.type == "string") {
                plugin_options[manifest.id][option.id] = document.querySelector("#plugin\\."+manifest.id+"\\."+option.id).value;
            } else if (option.type == "number") {
                plugin_options[manifest.id][option.id] = Math.floor(Number(document.querySelector("#plugin\\."+manifest.id+"\\."+option.id).value));
            } else if (option.type == "select") {
                plugin_options[manifest.id][option.id] = document.querySelector("#plugin\\."+manifest.id+"\\."+option.id).value;
            }
        }
    }

    return plugin_options;

}