//! C ABI for Simple Web Server's Rust core.
//!
//! This crate is linked **in-process** into the React Native macOS and Windows
//! apps. Everything a single server needs is exposed through a small, opaque
//! handle so the native side can create, start, stop and destroy any number of
//! independent servers concurrently — the same "many servers in one persistent
//! process" model the Electron version used.
//!
//! Threading: `SimpleWebServer::start()` binds the socket synchronously and then
//! spawns its own accept thread, so every function here returns promptly and the
//! caller (the RN native module) never blocks the UI thread.
//!
//! String lifetimes: `server::Settings<'a>` holds `&'a str` fields and the server
//! stores them `'static` (they are captured by the accept thread by `Copy`). The
//! upstream binary handled this with `Box::leak`; we do the same. Because a
//! server can outlive the `create` call and there is no join handle upstream, the
//! backing strings are intentionally leaked for the process lifetime. The leak is
//! bounded by the number of distinct server configurations created during a run.
//! See `docs/ARCHITECTURE.md` for the follow-up (add a join handle upstream to
//! reclaim them).

use std::ffi::{c_char, CStr, CString};
use std::ptr;

mod handler;
use handler::simple_web_server::SimpleWebServer;
use server::{generate_dummy_cert_and_key, Settings};

/// Mirror of `server::Settings`, laid out for C. All string fields are
/// NUL-terminated UTF-8 pointers owned by the caller for the duration of the
/// `sws_server_create` call only (we copy them).
#[repr(C)]
pub struct SwsSettings {
    pub port: i32,
    pub path: *const c_char,
    pub local_network: bool,
    pub spa: bool,
    pub rewrite_to: *const c_char,
    pub directory_listing: bool,
    pub exclude_dot_html: bool,
    pub ipv6: bool,
    pub hidden_dot_files: bool,
    pub cors: bool,
    pub upload: bool,
    pub replace: bool,
    pub delete: bool,
    pub hidden_dot_files_directory_listing: bool,
    pub custom401: *const c_char,
    pub custom403: *const c_char,
    pub custom404: *const c_char,
    pub custom500: *const c_char,
    pub http_auth: bool,
    pub http_auth_username: *const c_char,
    pub http_auth_password: *const c_char,
    pub index: bool,
    pub https: bool,
    pub https_cert: *const c_char,
    pub https_key: *const c_char,
}

/// Opaque server handle handed back to the native side.
pub struct SwsServerHandle {
    server: SimpleWebServer,
}

/// Copy a caller-owned C string into a leaked `'static` Rust string.
/// A null pointer or invalid UTF-8 becomes `""`.
fn cstr_to_static(ptr: *const c_char) -> &'static str {
    if ptr.is_null() {
        return "";
    }
    // Safety: caller guarantees `ptr` is a valid NUL-terminated string for the
    // duration of this call.
    let owned = unsafe { CStr::from_ptr(ptr) }
        .to_str()
        .unwrap_or("")
        .to_owned();
    Box::leak(owned.into_boxed_str())
}

/// Create a server from the given settings. Returns a handle, or null if
/// `settings` is null. The server is NOT started yet — call `sws_server_start`.
///
/// # Safety
/// `settings` must point to a valid `SwsSettings` for the duration of the call.
#[no_mangle]
pub unsafe extern "C" fn sws_server_create(
    settings: *const SwsSettings,
) -> *mut SwsServerHandle {
    if settings.is_null() {
        return ptr::null_mut();
    }
    let s = &*settings;

    let opts = Settings {
        port: s.port,
        path: cstr_to_static(s.path),
        local_network: s.local_network,
        spa: s.spa,
        rewrite_to: cstr_to_static(s.rewrite_to),
        directory_listing: s.directory_listing,
        exclude_dot_html: s.exclude_dot_html,
        ipv6: s.ipv6,
        hidden_dot_files: s.hidden_dot_files,
        cors: s.cors,
        upload: s.upload,
        replace: s.replace,
        delete: s.delete,
        hidden_dot_files_directory_listing: s.hidden_dot_files_directory_listing,
        custom401: cstr_to_static(s.custom401),
        custom403: cstr_to_static(s.custom403),
        custom404: cstr_to_static(s.custom404),
        custom500: cstr_to_static(s.custom500),
        http_auth: s.http_auth,
        http_auth_username: cstr_to_static(s.http_auth_username),
        http_auth_password: cstr_to_static(s.http_auth_password),
        index: s.index,
        https: s.https,
        https_cert: cstr_to_static(s.https_cert),
        https_key: cstr_to_static(s.https_key),
    };

    let handle = Box::new(SwsServerHandle {
        server: SimpleWebServer::new(opts),
    });
    Box::into_raw(handle)
}

/// Start listening. Returns `true` on success, `false` if binding failed
/// (e.g. the port is already in use — the native side maps this to EADDRINUSE).
///
/// # Safety
/// `handle` must be a live pointer returned by `sws_server_create`.
#[no_mangle]
pub unsafe extern "C" fn sws_server_start(handle: *mut SwsServerHandle) -> bool {
    if handle.is_null() {
        return false;
    }
    (*handle).server.start()
}

/// Signal the accept loop to stop. Safe to call more than once.
///
/// # Safety
/// `handle` must be a live pointer returned by `sws_server_create`.
#[no_mangle]
pub unsafe extern "C" fn sws_server_terminate(handle: *mut SwsServerHandle) {
    if handle.is_null() {
        return;
    }
    (*handle).server.terminate();
}

/// Terminate (if running) and free the handle. The pointer must not be used
/// afterwards. The backing settings strings are intentionally leaked (see the
/// module docs) because the accept thread cannot be joined upstream.
///
/// # Safety
/// `handle` must be a live pointer returned by `sws_server_create`, or null.
#[no_mangle]
pub unsafe extern "C" fn sws_server_free(handle: *mut SwsServerHandle) {
    if handle.is_null() {
        return;
    }
    let mut boxed = Box::from_raw(handle);
    boxed.server.terminate();
    drop(boxed);
}

/// Generate a fresh self-signed cert + private key (PEM). On success writes
/// newly-allocated C strings to `out_cert`/`out_key` (free with
/// `sws_string_free`) and returns `true`.
///
/// # Safety
/// `out_cert` and `out_key` must be valid, writable pointers.
#[no_mangle]
pub unsafe extern "C" fn sws_generate_cert_and_key(
    out_cert: *mut *mut c_char,
    out_key: *mut *mut c_char,
) -> bool {
    if out_cert.is_null() || out_key.is_null() {
        return false;
    }
    match generate_dummy_cert_and_key() {
        Ok((cert, key)) => {
            let (Ok(cert_c), Ok(key_c)) = (CString::new(cert), CString::new(key)) else {
                return false;
            };
            *out_cert = cert_c.into_raw();
            *out_key = key_c.into_raw();
            true
        }
        Err(_) => false,
    }
}

/// Free a string previously returned by this library.
///
/// # Safety
/// `s` must be a pointer returned by `sws_generate_cert_and_key`, or null.
#[no_mangle]
pub unsafe extern "C" fn sws_string_free(s: *mut c_char) {
    if s.is_null() {
        return;
    }
    drop(CString::from_raw(s));
}
