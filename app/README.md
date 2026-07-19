# Simple Web Server — v2 (React Native + Rust)

A rewrite of Simple Web Server for **Windows and macOS**:

- **UI:** React Native (`react-native-windows` + `react-native-macos`), a
  faithful port of the Electron interface that embraces native controls.
- **Servers:** a **Rust** core (vendored from
  [ethanaobrien/Rust-server](https://github.com/ethanaobrien/Rust-server))
  linked in-process via a small C ABI.

Linux is intentionally not supported.

## Highlights

- Runs **multiple** web servers at once, each independently configurable.
- **Keeps running in the background** with the window closed — no dock/taskbar
  icon required, optional menu-bar/tray icon.
- Server state (running / port-in-use / errors / URLs) **syncs live** into the
  UI.
- **Mac App Store**: manages security-scoped bookmarks so servers can read
  user-chosen folders inside the sandbox.

## Where things are

| Path | What |
| --- | --- |
| `src/` | React Native UI (TypeScript) |
| `native-common/` | `SwsSupervisor` — shared C++ server-lifecycle core |
| `rust-server/` | Vendored Rust core + `sws-ffi` C ABI (`ffi/include/sws_ffi.h`) |
| `macos/` | macOS native module (ObjC++) |
| `windows/` | Windows native module (C++/WinRT) |
| `docs/` | **Start here:** ARCHITECTURE, BUILD, OPTIONS |

## Build

See **[docs/BUILD.md](docs/BUILD.md)**. In short:

```sh
cd app/rust-server && cargo build -p sws-ffi --release   # Rust core (verified)
cd .. && npm install && npm run tsc                       # JS deps + typecheck
npm run macos     # on macOS, after react-native-macos-init + wiring
npm run windows   # on Windows, after react-native-windows-init + wiring
```

## Status

The Rust core and the shared C++ supervisor are build- and run-verified (on
Linux, headless). The RN UI and per-platform native modules are written to build
with the official toolchains but must be compiled/run on Windows and macOS — see
the "Status / limitations" sections in the docs.
