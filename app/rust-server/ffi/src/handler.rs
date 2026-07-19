// The actual request-handling logic lives in the UPSTREAM BINARY crate
// (ethanaobrien/Rust-server, src/simple_web_server.rs), not in the `server`
// library crate. We pull it in verbatim from the vendored copy so behavior stays
// identical to upstream. The `#[path]` attribute points at the vendored file so
// there is a single source of truth and re-vendoring stays trivial.
//
// The file declares `pub struct SimpleWebServer` and `impl SimpleWebServer` with
// `new`/`start`/`terminate`, using only items re-exported from the `server` crate.
#[path = "../../upstream/src/simple_web_server.rs"]
pub mod simple_web_server;
