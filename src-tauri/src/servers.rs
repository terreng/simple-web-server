// Manages the set of running web servers and keeps their state in sync with the
// config, mirroring the createServer/startServers logic from the Electron build.
use crate::logging::log;
use crate::simple_web_server::SimpleWebServer;
use serde_json::{json, Value};
use server::Settings;

pub struct RunningServer {
    pub config: Value,
    pub state: String,
    pub error_message: String,
    // None when the server failed to start (state == "error").
    server: Option<SimpleWebServer>,
}

#[derive(Default)]
pub struct AppState {
    pub config: Value,
    pub servers: Vec<RunningServer>,
}

fn leak(s: String) -> &'static str {
    Box::leak(s.into_boxed_str())
}

fn cfg_str(v: &Value, key: &str) -> String {
    v.get(key).and_then(|x| x.as_str()).unwrap_or("").to_string()
}

fn cfg_bool(v: &Value, key: &str) -> bool {
    v.get(key).and_then(|x| x.as_bool()).unwrap_or(false)
}

fn cfg_i32(v: &Value, key: &str) -> i32 {
    v.get(key).and_then(|x| x.as_i64()).unwrap_or(0) as i32
}

// Converts a UI server config object (camelCase JSON) into the server crate's
// Settings. Strings are leaked because Settings requires 'static references; the
// number of distinct configs over a session is small and bounded.
fn build_settings(sc: &Value, cert: String, key: String) -> Settings<'static> {
    Settings {
        port: cfg_i32(sc, "port"),
        path: leak(cfg_str(sc, "path")),
        local_network: cfg_bool(sc, "localnetwork"),
        spa: cfg_bool(sc, "spa"),
        rewrite_to: leak(cfg_str(sc, "rewriteTo")),
        directory_listing: cfg_bool(sc, "directoryListing"),
        exclude_dot_html: cfg_bool(sc, "excludeDotHtml"),
        ipv6: cfg_bool(sc, "ipv6"),
        hidden_dot_files: cfg_bool(sc, "hiddenDotFiles"),
        cors: cfg_bool(sc, "cors"),
        upload: cfg_bool(sc, "upload"),
        replace: cfg_bool(sc, "replace"),
        delete: cfg_bool(sc, "delete"),
        hidden_dot_files_directory_listing: cfg_bool(sc, "hiddenDotFilesDirectoryListing"),
        custom401: leak(cfg_str(sc, "custom401")),
        custom403: leak(cfg_str(sc, "custom403")),
        custom404: leak(cfg_str(sc, "custom404")),
        custom500: "",
        http_auth: cfg_bool(sc, "httpAuth"),
        http_auth_username: leak(cfg_str(sc, "httpAuthUsername")),
        http_auth_password: leak(cfg_str(sc, "httpAuthPassword")),
        index: cfg_bool(sc, "showIndex"),
        https: cfg_bool(sc, "https"),
        https_cert: leak(cert),
        https_key: leak(key),
        cache_control: leak(cfg_str(sc, "cacheControl")),
        // The UI's "precompression" toggle now enables on-the-fly gzip.
        compression: cfg_bool(sc, "precompression"),
    }
}

fn create_server(state: &mut AppState, sc: &Value) {
    if !cfg_bool(sc, "enabled") {
        return;
    }
    // Already running with this exact config.
    if state.servers.iter().any(|r| &r.config == sc) {
        return;
    }

    let https = cfg_bool(sc, "https");
    let port = cfg_i32(sc, "port");
    let path = cfg_str(sc, "path");

    // On macOS (Mac App Store), begin accessing the security-scoped resource
    // this folder was granted through its saved bookmark. No-op elsewhere.
    crate::bookmarks::start_accessing(&path);

    let (cert, key) = if https {
        let c = cfg_str(sc, "httpsCert");
        let k = cfg_str(sc, "httpsKey");
        if c.is_empty() || k.is_empty() {
            log("Generating temporary HTTPS certificate");
            server::generate_dummy_cert_and_key().unwrap_or((String::new(), String::new()))
        } else {
            (c, k)
        }
    } else {
        (String::new(), String::new())
    };

    if https && !server::validate_cert_and_key(&cert, &key) {
        state.servers.push(RunningServer {
            config: sc.clone(),
            state: "error".into(),
            error_message:
                "There might be something wrong with your HTTPS certificate and key.".into(),
            server: None,
        });
        return;
    }

    let settings = build_settings(sc, cert, key);
    let mut sws = SimpleWebServer::new(settings);
    if sws.start() {
        let host = if cfg_bool(sc, "localnetwork") {
            if cfg_bool(sc, "ipv6") { "::" } else { "0.0.0.0" }
        } else if cfg_bool(sc, "ipv6") {
            "::1"
        } else {
            "127.0.0.1"
        };
        log(&format!(
            "Listening on {}://{}:{}/",
            if https { "https" } else { "http" },
            host,
            port
        ));
        state.servers.push(RunningServer {
            config: sc.clone(),
            state: "running".into(),
            error_message: String::new(),
            server: Some(sws),
        });
    } else {
        log(&format!("Failed to listen on port {}", port));
        state.servers.push(RunningServer {
            config: sc.clone(),
            state: "error".into(),
            error_message: format!("Failed to listen on port {}. It may already be in use.", port),
            server: None,
        });
    }
}

// Reconciles running servers with config.servers: stop servers that are gone or
// disabled, start newly-enabled ones. Any change to a server's config (which
// flips something in the object) recreates that server, matching the old build.
pub fn start_servers(state: &mut AppState) {
    let desired: Vec<Value> = state
        .config
        .get("servers")
        .and_then(|s| s.as_array())
        .cloned()
        .unwrap_or_default();

    let mut i = 0;
    while i < state.servers.len() {
        let keep = desired.iter().any(|d| d == &state.servers[i].config);
        if keep {
            i += 1;
        } else {
            if let Some(srv) = state.servers[i].server.as_mut() {
                srv.terminate();
            }
            let removed = state.servers.remove(i);
            log(&format!("Killing server on port {}", cfg_i32(&removed.config, "port")));
            // Release the security-scoped resource if nothing else uses this path.
            let path = cfg_str(&removed.config, "path");
            if !path.is_empty()
                && !state.servers.iter().any(|r| cfg_str(&r.config, "path") == path)
            {
                crate::bookmarks::stop_accessing(&path);
            }
        }
    }

    for sc in &desired {
        create_server(state, sc);
    }
}

// Terminates every running server (used on quit).
pub fn stop_all(state: &mut AppState) {
    for r in state.servers.iter_mut() {
        if let Some(srv) = r.server.as_mut() {
            srv.terminate();
        }
    }
    state.servers.clear();
}

// The server_states payload the UI expects (array of {config, state, error_message}).
pub fn server_states(state: &AppState) -> Value {
    let arr: Vec<Value> = state
        .servers
        .iter()
        .map(|r| {
            json!({
                "config": r.config,
                "state": r.state,
                "error_message": r.error_message,
            })
        })
        .collect();
    Value::Array(arr)
}
