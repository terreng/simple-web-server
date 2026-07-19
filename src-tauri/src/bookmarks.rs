// Folder picker + macOS security-scoped bookmarks.
//
// On macOS (specifically Mac App Store sandboxed builds) the app can only read a
// user-selected folder across launches if it saves a *security-scoped bookmark*
// for the folder at the moment it is chosen, then resolves and "starts
// accessing" that bookmark before serving from the folder. Tauri has no built-in
// support for this, so the macOS path below drives NSOpenPanel + NSURL bookmark
// APIs directly. On other platforms the folder picker is the standard Tauri
// dialog and the bookmark functions are no-ops.

// ---------------------------------------------------------------------------
// Non-macOS: plain Tauri dialog, no bookmarks needed.
// ---------------------------------------------------------------------------
#[cfg(not(target_os = "macos"))]
pub fn pick_folder(app: &tauri::AppHandle, current: Option<String>) -> Option<String> {
    use tauri_plugin_dialog::DialogExt;
    let mut builder = app.dialog().file();
    if let Some(dir) = current {
        if !dir.is_empty() {
            builder = builder.set_directory(dir);
        }
    }
    builder.blocking_pick_folder().map(|p| p.to_string())
}

#[cfg(not(target_os = "macos"))]
pub fn start_accessing(_path: &str) {}

#[cfg(not(target_os = "macos"))]
pub fn stop_accessing(_path: &str) {}

// ---------------------------------------------------------------------------
// macOS: native open panel + security-scoped bookmarks.
// ---------------------------------------------------------------------------
#[cfg(target_os = "macos")]
pub fn pick_folder(app: &tauri::AppHandle, current: Option<String>) -> Option<String> {
    // NSOpenPanel must run on the main thread. Dispatch there, run the modal,
    // and send the chosen path (with a bookmark created) back to this thread.
    let (tx, rx) = std::sync::mpsc::channel::<Option<String>>();
    let _ = app.run_on_main_thread(move || {
        let result = mac::run_open_panel(current);
        let _ = tx.send(result);
    });
    rx.recv().ok().flatten()
}

#[cfg(target_os = "macos")]
pub fn start_accessing(path: &str) {
    mac::start_accessing(path);
}

#[cfg(target_os = "macos")]
pub fn stop_accessing(path: &str) {
    mac::stop_accessing(path);
}

#[cfg(target_os = "macos")]
mod mac {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use objc2_app_kit::NSOpenPanel;
    use objc2_foundation::{
        MainThreadMarker, NSData, NSString, NSURL, NSURLBookmarkCreationOptions,
        NSURLBookmarkResolutionOptions,
    };
    use std::collections::{HashMap, HashSet};
    use std::sync::{Mutex, OnceLock};

    // NSModalResponseOK; NSModalResponse is an NSInteger (isize) alias.
    const NS_MODAL_RESPONSE_OK: isize = 1;

    // path -> base64(bookmark data), persisted next to config.json.
    fn load_store() -> HashMap<String, String> {
        match std::fs::read_to_string(crate::config::bookmarks_path()) {
            Ok(s) => serde_json::from_str(&s).unwrap_or_default(),
            Err(_) => HashMap::new(),
        }
    }

    fn save_store(map: &HashMap<String, String>) {
        crate::config::ensure_data_dir();
        if let Ok(s) = serde_json::to_string_pretty(map) {
            let _ = std::fs::write(crate::config::bookmarks_path(), s);
        }
    }

    // Tracks paths we've already begun accessing this session so we don't
    // resolve/start a bookmark more than once per path.
    fn started() -> &'static Mutex<HashSet<String>> {
        static STARTED: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();
        STARTED.get_or_init(|| Mutex::new(HashSet::new()))
    }

    pub fn run_open_panel(current: Option<String>) -> Option<String> {
        // We are always dispatched here via run_on_main_thread, so this is the
        // main thread and the marker is sound.
        let mtm = unsafe { MainThreadMarker::new_unchecked() };
        unsafe {
            let panel = NSOpenPanel::openPanel(mtm);
            panel.setCanChooseDirectories(true);
            panel.setCanChooseFiles(false);
            panel.setCanCreateDirectories(true);
            panel.setAllowsMultipleSelection(false);

            if let Some(dir) = current {
                if !dir.is_empty() {
                    let url = NSURL::fileURLWithPath(&NSString::from_str(&dir));
                    panel.setDirectoryURL(Some(&url));
                }
            }

            let response = panel.runModal();
            if response != NS_MODAL_RESPONSE_OK {
                return None;
            }

            let url = panel.URL()?;
            let path = url.path()?.to_string();

            // Create a security-scoped bookmark. This only succeeds in a
            // sandboxed (MAS) build with the files.bookmarks.app-scope
            // entitlement; in non-sandboxed builds it errors and we simply don't
            // store a bookmark (full disk access already applies).
            match url
                .bookmarkDataWithOptions_includingResourceValuesForKeys_relativeToURL_error(
                    NSURLBookmarkCreationOptions::NSURLBookmarkCreationWithSecurityScope,
                    None,
                    None,
                ) {
                Ok(data) => {
                    let encoded = STANDARD.encode(data.bytes());
                    let mut store = load_store();
                    store.insert(path.clone(), encoded);
                    save_store(&store);
                }
                Err(_) => {}
            }

            Some(path)
        }
    }

    pub fn start_accessing(path: &str) {
        if path.is_empty() {
            return;
        }
        {
            let mut set = started().lock().unwrap();
            if set.contains(path) {
                return;
            }
            set.insert(path.to_string());
        }

        let store = load_store();
        let Some(encoded) = store.get(path) else {
            return;
        };
        let Ok(bytes) = STANDARD.decode(encoded) else {
            return;
        };

        unsafe {
            let nsdata = NSData::with_bytes(&bytes);
            // We don't act on staleness; pass a null out-pointer.
            match NSURL::URLByResolvingBookmarkData_options_relativeToURL_bookmarkDataIsStale_error(
                &nsdata,
                NSURLBookmarkResolutionOptions::NSURLBookmarkResolutionWithSecurityScope,
                None,
                std::ptr::null_mut(),
            ) {
                Ok(url) => {
                    let _ = url.startAccessingSecurityScopedResource();
                    // Keep the URL alive for the process lifetime so access
                    // persists. We never call the matching stop (see below).
                    std::mem::forget(url);
                }
                Err(_) => {}
            }
        }
    }

    // Access is intentionally held for the process lifetime (we forget the URL
    // in start_accessing), so there is nothing to release here.
    pub fn stop_accessing(_path: &str) {}
}
