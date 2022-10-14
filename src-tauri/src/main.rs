#![cfg_attr(
	all(not(debug_assertions), target_os = "windows"),
	windows_subsystem = "windows"
)]
use serde_json::{Value};
use serde_json::json;
use std::fs::File;
use std::io::BufReader;
use std::io::BufWriter;
use std::io::Write;
use std::path::Path;

const VERSION : i32 = 1001004;
const INSTALL_SOURCE : &str = "website";

fn main() {
	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![init])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

#[tauri::command]
fn init() -> Value {
	let mut config : Value = json!({});
	if Path::new("config.json").exists() {
		let file = File::open("config.json").expect("Unable to open");
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
    let f = File::create("config.json").expect("Unable to create file");
    let mut f = BufWriter::new(f);
    f.write_all(data.as_bytes()).expect("Unable to write data");
}