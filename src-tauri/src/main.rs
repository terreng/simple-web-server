#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]
#[cfg(target_os = "macos")]
static PLATFORM: &str = "macos";
#[cfg(target_os = "linux")]
static PLATFORM: &str = "linux";
#[cfg(target_os = "windows")]
static PLATFORM: &str = "windows";
use serde_json::json;
use serde_json::Value;
use std::fs::File;
use std::io::BufReader;
use std::io::BufWriter;
use std::io::Write;
use std::path::Path;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

const VERSION: i32 = 1001004;
const INSTALL_SOURCE: &str = "website";

fn languages() -> HashMap<&'static str, &'static str> {
    let mut languages = HashMap::new();
    languages.insert("en", "English");
    languages.insert("es", "Español");
    languages.insert("ru", "Русский");
    languages.insert("zh_CN", "简体中文");
    languages.insert("ja", "日本語");
    languages.insert("fr_FR", "Français");
    languages.insert("pt_PT", "Português");
    languages.insert("it_IT", "Italiano");
    languages.insert("uk", "Українська");
    languages.insert("de", "Deutsch");
    languages.insert("sv", "Svenska");
    languages
}

fn savepath() -> String {
    let config_directory: String = dirs::config_dir().unwrap().display().to_string();
    let program_subdirectory: &str = if PLATFORM == "macos" {
        "/Simple Web Server/"
    } else {
        "\\Simple Web Server\\"
    };
    return config_directory + program_subdirectory;
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![init, saveconfig, quit])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                // api.prevent_exit();
            }
            _ => {}
        });
}

fn get_lang(language: &str, _app_handle: &tauri::AppHandle) -> HashMap<String, String> {
    let mut lang_to_return: HashMap<String, String> = HashMap::new();

    // Include the default language file at compile time
    let default_lang_content = include_str!("../../lang/en.json");
    let default_lang: HashMap<String, String> = serde_json::from_str(default_lang_content)
        .expect("Failed to parse default language file");

    if language != "en" {
        // Try to read the target language file
        let target_lang_path = format!("../../lang/{}.json", language.split('_').next().unwrap());
        if let Ok(target_lang_content) = std::fs::read_to_string(target_lang_path) {
            if let Ok(target_lang) = serde_json::from_str::<HashMap<String, String>>(&target_lang_content) {
                for (key, value) in default_lang {
                    lang_to_return.insert(key.clone(), target_lang.get(&key).unwrap_or(&value).clone());
                }
            } else {
                lang_to_return = default_lang.clone();
            }
        } else {
            lang_to_return = default_lang.clone();
        }
    } else {
        return default_lang;
    }

    lang_to_return
}

#[tauri::command]
fn init(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let config: Value = if Path::new(&(savepath() + "config.json")).exists() {
        let file = File::open(savepath() + "config.json").map_err(|e| e.to_string())?;
        let reader = BufReader::new(file);
        serde_json::from_reader(reader).map_err(|e| e.to_string())?
    } else {
        json!({})
    };

    let available_languages = languages();
    let lang_data = get_lang("en", &app_handle);

    Ok(json!({
        "config": config,
        "ip": ["127.0.0.1"], // TODO: Get IPs
        "install_source": INSTALL_SOURCE,
        "plugins": {},  // TODO: Support plugins
        "platform": "darwin",  // TODO: Change from "darwin" to the PLATFORM constant
        "languages": available_languages,
        "language": "en",  // TODO: Detect device language
        "lang": lang_data
    }))
}

#[tauri::command]
fn saveconfig(config: Value) {
    let data = config.to_string();
    let f = File::create(savepath() + "config.json").expect("Unable to create file");
    let mut f = BufWriter::new(f);
    f.write_all(data.as_bytes()).expect("Unable to write data");
}

#[tauri::command]
fn quit(handle: tauri::AppHandle) {
    handle.exit(0);
}
