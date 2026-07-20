// Simple Web Server — Tauri backend.
//
// This mirrors the behaviour of the original Electron main process (index.js):
// it loads/saves config.json, manages a set of web servers (start/stop/state),
// watches for external config changes, reports IP changes, and handles the
// tray, background running, and (on macOS) dock hiding + security-scoped
// bookmarks.

mod bookmarks;
mod config;
mod ip;
mod lang;
mod logging;
mod servers;
mod simple_web_server;

use serde_json::{json, Value};
use servers::AppState;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};

// Where this build was installed from. Overridable at build time via the
// SWS_INSTALL_SOURCE env var (e.g. "macappstore", "microsoftstore").
const INSTALL_SOURCE: &str = match option_env!("SWS_INSTALL_SOURCE") {
    Some(s) => s,
    None => "website",
};

// Set true when the user explicitly quits, so the exit/close handlers don't keep
// the process alive in background mode.
static QUITTING: AtomicBool = AtomicBool::new(false);

// Serialized form of the config we last wrote ourselves, so the file watcher can
// tell our own writes apart from genuine external edits.
fn last_saved() -> &'static Mutex<String> {
    static L: OnceLock<Mutex<String>> = OnceLock::new();
    L.get_or_init(|| Mutex::new(String::new()))
}

fn set_last_saved(config: &Value) {
    if let Ok(s) = serde_json::to_string(config) {
        *last_saved().lock().unwrap() = s;
    }
}

fn cfg_bool(config: &Value, key: &str) -> bool {
    config.get(key).and_then(|v| v.as_bool()).unwrap_or(false)
}

fn platform() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "darwin"
    }
    #[cfg(target_os = "windows")]
    {
        "win32"
    }
    #[cfg(target_os = "linux")]
    {
        "linux"
    }
}

// ---------------------------------------------------------------------------
// macOS dock visibility (hide the dock icon when running with no window).
// ---------------------------------------------------------------------------
#[cfg(target_os = "macos")]
fn set_dock_visible(app: &AppHandle, visible: bool) {
    // Accessory hides the dock icon (background, no window); Regular shows it.
    let policy = if visible {
        tauri::ActivationPolicy::Regular
    } else {
        tauri::ActivationPolicy::Accessory
    };
    let _ = app.set_activation_policy(policy);
}

#[cfg(not(target_os = "macos"))]
fn set_dock_visible(_app: &AppHandle, _visible: bool) {}

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------
const TRAY_ID: &str = "main-tray";

// The tray icon bytes: a monochrome template on macOS (system tints it for the
// menu bar), a full-colour icon elsewhere.
#[cfg(target_os = "macos")]
const TRAY_ICON_BYTES: &[u8] = include_bytes!("../../images/menuBarIconTemplate@2x.png");
#[cfg(not(target_os = "macos"))]
const TRAY_ICON_BYTES: &[u8] = include_bytes!("../icons/32x32.png");
const TRAY_ICON_IS_TEMPLATE: bool = cfg!(target_os = "macos");

fn create_tray(app: &AppHandle) {
    // The app's tray manager is the source of truth; don't create a second one.
    if app.tray_by_id(TRAY_ID).is_some() {
        return;
    }
    let mut builder = TrayIconBuilder::with_id(TRAY_ID).tooltip("Simple Web Server");
    if let Ok(icon) = tauri::image::Image::from_bytes(TRAY_ICON_BYTES) {
        builder = builder.icon(icon).icon_as_template(TRAY_ICON_IS_TEMPLATE);
    }
    let app2 = app.clone();
    let _ = builder
        .on_tray_icon_event(move |_tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(&app2);
            }
        })
        .build(app);
}

fn remove_tray(app: &AppHandle) {
    // Dropping our own handle isn't enough — the app manager retains the tray by
    // id, so remove it there.
    let _ = app.remove_tray_by_id(TRAY_ID);
}

fn show_main_window(app: &AppHandle) {
    set_dock_visible(app, true);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

// ---------------------------------------------------------------------------
// Config-driven side effects (theme, tray, servers).
// ---------------------------------------------------------------------------
fn apply_theme(app: &AppHandle, theme: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let t = match theme {
            "light" => Some(tauri::Theme::Light),
            "dark" => Some(tauri::Theme::Dark),
            _ => None,
        };
        let _ = window.set_theme(t);
    }
}

// Applies everything that depends on the current config: logging, theme, tray,
// and the running set of servers. Does NOT emit state — callers do that.
fn apply_config_changed(app: &AppHandle) {
    let (want_tray, theme) = {
        let state = app.state::<Mutex<AppState>>();
        let mut st = state.lock().unwrap();
        let config = st.config.clone();
        logging::set_logging(cfg_bool(&config, "log"));
        let want_tray = cfg_bool(&config, "tray");
        let theme = config
            .get("theme")
            .and_then(|v| v.as_str())
            .unwrap_or("system")
            .to_string();
        servers::start_servers(&mut st);
        (want_tray, theme)
    };

    // Theme + tray must run on the main thread.
    let app2 = app.clone();
    let _ = app.run_on_main_thread(move || {
        apply_theme(&app2, &theme);
        if want_tray {
            create_tray(&app2);
        } else {
            remove_tray(&app2);
        }
    });
}

fn emit_state(app: &AppHandle) {
    let state = app.state::<Mutex<AppState>>();
    let payload = json!({ "server_states": servers::server_states(&state.lock().unwrap()) });
    let _ = app.emit("state", payload);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
#[tauri::command]
fn init(app: AppHandle) -> Value {
    let state = app.state::<Mutex<AppState>>();
    let config = state.lock().unwrap().config.clone();
    let language = lang::get_language(&config);
    json!({
        "config": config,
        "ip": ip::get_ips(),
        "install_source": INSTALL_SOURCE,
        "plugins": {},
        "platform": platform(),
        "languages": lang::languages_map(),
        "language": language,
        "lang": lang::get_lang(&language),
        "version": env!("CARGO_PKG_VERSION"),
    })
}

#[tauri::command]
fn get_states(app: AppHandle) -> Value {
    let state = app.state::<Mutex<AppState>>();
    let states = servers::server_states(&state.lock().unwrap());
    states
}

#[tauri::command]
fn saveconfig(app: AppHandle, config: Value, reload: Option<bool>) {
    {
        let state = app.state::<Mutex<AppState>>();
        let mut st = state.lock().unwrap();
        st.config = config.clone();
    }
    let _ = config::save_config(&config);
    set_last_saved(&config);

    apply_config_changed(&app);
    emit_state(&app);

    if reload == Some(true) {
        let _ = app.emit("reload", ());
    }
}

#[tauri::command]
fn quit(app: AppHandle) {
    QUITTING.store(true, Ordering::Relaxed);
    {
        let state = app.state::<Mutex<AppState>>();
        servers::stop_all(&mut state.lock().unwrap());
    }
    app.exit(0);
}

#[tauri::command]
fn show_picker(app: AppHandle, current_path: Option<String>) -> Vec<String> {
    match bookmarks::pick_folder(&app, current_path) {
        Some(path) => vec![path],
        None => vec![],
    }
}

#[tauri::command]
fn generate_crypto() -> Value {
    match server::generate_dummy_cert_and_key() {
        Ok((cert, key)) => json!({ "cert": cert, "privateKey": key }),
        Err(_) => Value::Null,
    }
}

#[tauri::command]
fn open_external(app: AppHandle, url: String) {
    use tauri_plugin_shell::ShellExt;
    let _ = app.shell().open(url, None);
}

// Checks the configured updater endpoint. Returns update info when one is
// available, null when up to date, or an error string (e.g. no endpoint yet).
#[tauri::command]
async fn check_update(app: AppHandle) -> Result<Option<Value>, String> {
    use tauri_plugin_updater::UpdaterExt;
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => Ok(Some(json!({
            "version": update.version,
            "currentVersion": update.current_version,
            "notes": update.body,
        }))),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

// Downloads and installs the pending update, then restarts the app.
#[tauri::command]
async fn install_update(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater
        .check()
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "No update available".to_string())?;
    update
        .download_and_install(|_downloaded, _total| {}, || {})
        .await
        .map_err(|e| e.to_string())?;
    app.restart()
}

// ---------------------------------------------------------------------------
// Background threads: IP change polling + external config.json watching.
// ---------------------------------------------------------------------------
fn spawn_ip_watcher(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last = ip::get_ips();
        loop {
            std::thread::sleep(Duration::from_secs(10));
            let now = ip::get_ips();
            if now != last {
                last = now.clone();
                logging::log(&format!("IP(s) changed: {}", now));
                let _ = app.emit("ipchange", json!({ "ip": now }));
            }
        }
    });
}

fn spawn_config_watcher(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(1));
        let disk = config::load_config();
        let disk_ser = serde_json::to_string(&disk).unwrap_or_default();
        if disk_ser == *last_saved().lock().unwrap() {
            continue; // our own write, or already applied
        }
        *last_saved().lock().unwrap() = disk_ser;

        logging::log("config.json changed externally. Reloading.");
        {
            let state = app.state::<Mutex<AppState>>();
            state.lock().unwrap().config = disk;
        }
        apply_config_changed(&app);
        emit_state(&app);
        let _ = app.emit("reload", ());
    });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
pub fn run() {
    let config = config::load_config();
    logging::set_logging(cfg_bool(&config, "log"));

    let mut builder = tauri::Builder::default();

    // Single-instance must be registered first: a second launch focuses the
    // existing window instead of starting another process.
    builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        show_main_window(app);
    }));

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(Mutex::new(AppState {
            config: config.clone(),
            servers: Vec::new(),
        }))
        .invoke_handler(tauri::generate_handler![
            init,
            get_states,
            saveconfig,
            quit,
            show_picker,
            generate_crypto,
            open_external,
            check_update,
            install_update
        ])
        .setup(move |app| {
            let handle = app.handle().clone();
            set_last_saved(&config);
            logging::log(&format!(
                "Simple Web Server {} starting",
                env!("CARGO_PKG_VERSION")
            ));

            // Start servers + apply tray/theme from the loaded config.
            apply_config_changed(&handle);

            spawn_ip_watcher(handle.clone());
            spawn_config_watcher(handle.clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if QUITTING.load(Ordering::Relaxed) {
                    return;
                }
                let app = window.app_handle();
                let background = {
                    let state = app.state::<Mutex<AppState>>();
                    let bg = cfg_bool(&state.lock().unwrap().config, "background");
                    bg
                };
                if background {
                    // Keep running with no visible window: hide it and hide the
                    // dock icon (macOS). The tray / relaunch brings it back.
                    api.prevent_close();
                    let _ = window.hide();
                    set_dock_visible(app, false);
                } else {
                    // Not running in the background: closing the window quits the
                    // app. macOS otherwise keeps the process alive, so exit here
                    // explicitly for consistent behaviour across platforms.
                    QUITTING.store(true, Ordering::Relaxed);
                    {
                        let state = app.state::<Mutex<AppState>>();
                        servers::stop_all(&mut state.lock().unwrap());
                    }
                    app.exit(0);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                if QUITTING.load(Ordering::Relaxed) {
                    return;
                }
                let background = {
                    let state = app.state::<Mutex<AppState>>();
                    let bg = cfg_bool(&state.lock().unwrap().config, "background");
                    bg
                };
                if background {
                    // Stay alive in the background even with no windows open.
                    api.prevent_exit();
                }
            }
            tauri::RunEvent::Exit => {
                let state = app.state::<Mutex<AppState>>();
                servers::stop_all(&mut state.lock().unwrap());
            }
            _ => {}
        });
}
