# Architecture

Simple Web Server v2 replaces the Electron + Node.js stack with **React Native
(Windows + macOS)** for the UI and a **Rust core** for the web servers, linked
in-process through a small C ABI.

```
┌───────────────────────────────────────────────────────────────┐
│ Native app process (one per running instance of the app)        │
│                                                                 │
│  ┌─────────────────────┐        ┌──────────────────────────┐   │
│  │ React Native UI (JS)│  <——>  │ Native module            │   │
│  │  src/ (TypeScript)  │ bridge │  ServerManager           │   │
│  └─────────────────────┘ events └──────────┬───────────────┘   │
│         window (optional)                    │                  │
│                                              ▼                  │
│                                  ┌──────────────────────────┐   │
│                                  │ App core (singleton)     │   │
│                                  │  macOS: SWSAppCore       │   │
│                                  │  win:   sws::AppCore     │   │
│                                  │  • config store (watch)  │   │
│                                  │  • IP monitor            │   │
│                                  │  • MAS bookmarks (mac)   │   │
│                                  │  • tray / background     │   │
│                                  └──────────┬───────────────┘   │
│                                             ▼                  │
│                                  ┌──────────────────────────┐   │
│                                  │ SwsSupervisor (C++)      │   │
│                                  │  reconcile(desired[])    │   │
│                                  │  N running servers       │   │
│                                  └──────────┬───────────────┘   │
│                                             ▼ C ABI (sws_ffi.h) │
│                                  ┌──────────────────────────┐   │
│                                  │ Rust core (sws-ffi)      │   │
│                                  │  vendored server crate   │   │
│                                  │  1 accept thread/server  │   │
│                                  └──────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```

## Why in-process (not a child process)

Two hard requirements drove this:

1. **Mac App Store security-scoped bookmarks.** A bookmarked folder's access
   (`startAccessingSecurityScopedResource`) is only valid inside the sandboxed
   app process. A separate server process could not read the user's chosen
   folder. So the Rust server runs *inside* the app process, and the macOS core
   begins/ends bookmark access around each server's lifetime.
2. **Background operation.** The servers must keep running with the window
   closed. Keeping them on native threads inside the app process (owned by the
   app core, not the JS bridge) makes "no window" trivial — closing the window
   never touches the servers.

## The Electron → RN mapping

| Electron | v2 |
| --- | --- |
| Main process (Node) owns servers | App core (native) owns servers |
| Renderer (Chromium) = UI | React Native JS = UI |
| `ipcRenderer`/`preload` `window.api.*` | `NativeModules.ServerManager` |
| `webContents.send('message', …)` | `NativeEventEmitter` events |
| `config.json` in userData, watched | Same file, watched by the app core |
| `running_servers[]` + `startServers()` reconcile | `SwsSupervisor::reconcile()` |
| `app.on('window-all-closed')` keep-alive | `applicationShouldTerminateAfterLastWindowClosed` (mac) / `WM_CLOSE` hide (win) |
| `app.dock.hide()` | `NSApplicationActivationPolicyAccessory` |
| `Tray` | `NSStatusItem` (mac) / `Shell_NotifyIcon` (win) |
| `bookmarks.js` | `SWSBookmarks` (mac only) |
| Node `https`/`node-forge` self-signed cert | `sws_generate_cert_and_key` (Rust/OpenSSL) |

## Background mode — how it actually works (kept simple)

The Electron app didn't do anything exotic: the **main process** hosts the
servers and simply doesn't quit when the window closes (`config.background`),
hiding the dock icon on macOS. `config.tray` is independent — you can run fully
hidden with no window, no dock/taskbar icon, and no tray icon.

v2 keeps this shape. The servers live in the app-core singleton on native
threads. Closing the window:

- **macOS:** `applicationShouldTerminateAfterLastWindowClosed` returns `NO` when
  `config.background`; the core switches the activation policy to *accessory*
  (dock icon hidden). Servers are untouched.
- **Windows:** the main window's `WM_CLOSE` hides the window (removing the
  taskbar button) instead of destroying it. Servers are untouched.

No headless service, no second process, no IPC socket. If `config.background`
is false, the app quits normally on window close (after `shutdown()` stops the
servers).

## Multiple servers + state sync

`config.servers` is an array. `reconcile(desired)`:

- stops any running server whose exact config is no longer present/enabled,
- starts any enabled config that isn't already running,
- matches running↔desired by **full-config equality** (same rule the UI uses),
  so editing any field cleanly restarts just that server.

Whenever the running set changes, the core fires `serverStates`, which the UI
renders (state chip, URLs, or the port-in-use / stale-bookmark error panel).
External edits to `config.json` fire `configReload`, and the UI reloads — same
as Electron.

## String-lifetime note (Rust FFI)

`server::Settings<'a>` holds `&'a str` and the accept thread captures them by
`Copy`. Upstream has no join handle, so the FFI leaks the per-server setting
strings for the process lifetime (bounded by the number of distinct configs
created per run). See `rust-server/VENDOR.md` for the clean fix.

## What is verified vs. not

- ✅ **Rust FFI** builds and serves real files; duplicate-port returns the
  bind-failure the UI shows as "port in use"; cert generation works.
  (Verified on Linux — see `docs/BUILD.md`.)
- ✅ **SwsSupervisor** (the shared reconcile core) is compile-tested and
  exercised end-to-end against the real library on Linux.
- ⚠️ **RN UI, macOS/Windows native modules, tray/background, MAS bookmarks**
  are written to build with the official toolchains but must be compiled and
  run on Windows/macOS (this repo was developed on Linux). See BUILD.md.
