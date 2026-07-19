# Vendored Rust core

`upstream/` is a vendored copy of the Simple Web Server Rust core.

- **Source:** https://github.com/ethanaobrien/Rust-server
- **Pinned commit:** `0caf0850dafd2bf8ffe782a4da40d2d31f790ce3`
- **Vendored:** 2026-07 (`.git` removed; sources otherwise unmodified)

## Layout

| Path | What it is |
| --- | --- |
| `upstream/src/server/` | The `server` **library** crate — sockets, TLS, `Server`, `Settings`, `Request`, file serving primitives. This is what the app links against. |
| `upstream/src/simple_web_server.rs` | The request-handling logic (`SimpleWebServer`). Upstream keeps this in the **binary**, not the library, so we include it directly from the FFI crate via `#[path]` (see `ffi/src/handler.rs`). |
| `upstream/src/main.rs`, `upstream/Cargo.toml` | Upstream's CLI binary, kept for reference. Not used by the app. |
| `ffi/` | Our thin C-ABI wrapper (`sws-ffi`). The only crate the app actually builds. |

## Re-vendoring

```sh
git clone https://github.com/ethanaobrien/Rust-server /tmp/rs
rm -rf app/rust-server/upstream
cp -r /tmp/rs app/rust-server/upstream
rm -rf app/rust-server/upstream/.git
# update the pinned commit above
```

If upstream moves `simple_web_server.rs` or changes the `Settings` struct, update
`ffi/src/handler.rs`, `ffi/src/lib.rs`, and `ffi/include/sws_ffi.h` to match.

## Build

```sh
cd app/rust-server
cargo build -p sws-ffi --release
# => target/release/libsws_ffi.a  (link into the app)
#    target/release/libsws_ffi.so / .dylib / sws_ffi.dll
```

Requires a C compiler + perl + make (for `openssl` with the `vendored` feature).

## Notes / follow-ups

- Settings strings are leaked for the process lifetime (upstream has no thread
  join handle, so the accept thread may still read them after `terminate()`).
  The leak is bounded by the number of distinct server configs created per run.
  A clean fix is to add a `JoinHandle` to `Server` upstream and reclaim the
  strings in `sws_server_free`.
