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
use serde_json::{Value};
use serde_json::json;
use std::fs::File;
use std::io::BufReader;
use std::io::BufWriter;
use std::io::Write;
use std::path::Path;

const VERSION : i32 = 1001004;
const INSTALL_SOURCE : &str = "website";

fn savepath() -> String {
	let config_directory : String = dirs::config_dir().unwrap().display().to_string();
	let program_subdirectory : &str = if PLATFORM == "macos" {"/Simple Web Server/"} else {"\\Simple Web Server\\"};
	return config_directory + program_subdirectory;
}

fn main() {
	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![init, saveconfig, quit])
		.build(tauri::generate_context!())
		.expect("error while building tauri application")
		.run(|_app_handle, event| match event {
			tauri::RunEvent::ExitRequested { api, .. } => {
				api.prevent_exit();
			}
			_ => {}
		});
}

#[tauri::command]
fn init() -> Value {
	let mut config : Value = json!({});
	if Path::new(&(savepath() + "config.json")).exists() {
		let file = File::open(savepath() + "config.json").expect("Unable to open");
		let reader = BufReader::new(file);
		config = serde_json::from_reader(reader).expect("Unable to read JSON");
	}
	return json!({
		"config": config,
		"ip": ["127.0.0.1"],
		"install_source": INSTALL_SOURCE
	});
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