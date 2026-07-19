// Application data directory + config.json load/save.
use serde_json::Value;
use std::path::PathBuf;

// ~/Library/Application Support/Simple Web Server (macOS),
// %APPDATA%\Simple Web Server (Windows), ~/.config/Simple Web Server (Linux).
pub fn data_dir() -> PathBuf {
    let mut dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    dir.push("Simple Web Server");
    dir
}

pub fn config_path() -> PathBuf {
    data_dir().join("config.json")
}

pub fn log_path() -> PathBuf {
    data_dir().join("server.log")
}

// Used by the macOS security-scoped bookmark store.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn bookmarks_path() -> PathBuf {
    data_dir().join("bookmarks.json")
}

pub fn ensure_data_dir() {
    let _ = std::fs::create_dir_all(data_dir());
}

pub fn load_config() -> Value {
    match std::fs::read_to_string(config_path()) {
        Ok(s) => serde_json::from_str(&s).unwrap_or_else(|_| serde_json::json!({})),
        Err(_) => serde_json::json!({}),
    }
}

pub fn save_config(config: &Value) -> std::io::Result<()> {
    ensure_data_dir();
    let data = serde_json::to_string_pretty(config).unwrap_or_else(|_| "{}".to_string());
    std::fs::write(config_path(), data)
}
