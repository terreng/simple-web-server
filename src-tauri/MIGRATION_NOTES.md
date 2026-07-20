# Tauri migration notes

This app was migrated from Electron + Node.js to **Tauri v2 + a Rust web
server**. The HTML/CSS/JS UI is unchanged in look; only the glue to the backend
was rewired.

## Running

```sh
npm install
npm run tauri dev      # development
npm run tauri build    # production bundle
```

`beforeDevCommand`/`beforeBuildCommand` run `scripts/copy-frontend.js`, which
copies just the UI assets (index.html, main.js, style.css, images/, fonts/,
LICENSE, open_source_licenses.txt) into `src-tauri/frontend/` (gitignored). That
directory is the `frontendDist`, so the bundle never includes `node_modules`,
`target/`, `.git`, the website, etc.

> If you edit a root UI file during `tauri dev`, re-run the dev command (or the
> copy script) to resync.

## Packaging a release

```sh
npm run tauri build                              # current OS, default targets
npm run tauri build -- --target universal-apple-darwin   # macOS universal (arm64+x64)
```

`tauri build` produces installers for **the OS you run it on** — Tauri does not
cross-compile the installers (each platform's bundler — dmg, NSIS, deb/rpm — is
native):

- **macOS** (your machine): builds the macOS `.app` + `.dmg`, and the MAS
  `.pkg` with the right signing/provisioning. You **cannot** build the Windows
  or Linux packages here.
- **Windows** `.exe`/NSIS installer: build on Windows.
- **Linux** `.deb`/`.rpm`/AppImage: build on Linux (needs
  `libwebkit2gtk-4.1-dev` etc.).

The practical option for all three is CI — `tauri-apps/tauri-action` on a
GitHub Actions matrix (`macos-latest`, `windows-latest`, `ubuntu-latest`)
builds and uploads each platform's artifacts. That's the recommended
replacement for the old `electron-builder` multi-target build.

Bundle metadata (identifier, publisher, homepage, license, copyright, category,
descriptions, macOS min version) is set in `tauri.conf.json` to mirror the old
electron-builder config. Signing identities/certs are intentionally left null —
fill them in (or pass via env/CI secrets) at release time. Tauri names
artifacts `Simple Web Server_<version>_<arch>` rather than the old
`Simple-Web-Server-<os>-<version>-<arch>`; rename in CI if you want the old
scheme.

## Architecture

- **`src-tauri/server/`** — the Rust web server, vendored from
  `github.com/ethanaobrien/Rust-server`, with two additions:
  - `Settings.cache_control` — sets a `Cache-Control` header.
  - `Settings.compression` — on-the-fly gzip (Accept-Encoding aware, only for
    compressible types, skipped for range/HEAD, capped at 50 MB).
  - Also fixed: the TLS loader now accepts PKCS#8 keys (`PKey::private_key_from_pem`),
    so generated certificates actually load for HTTPS.
- **`src-tauri/src/`**
  - `lib.rs` — Tauri app: commands, tray, background running, dock hiding,
    single-instance, IP + config watchers, event loop.
  - `servers.rs` — starts/stops multiple servers and syncs their state to the UI
    (`state` event). Maps the UI's camelCase config to the server `Settings`.
  - `simple_web_server.rs` — the request handler (vendored).
  - `config.rs`, `ip.rs`, `lang.rs`, `logging.rs`, `bookmarks.rs`.

### Commands / events (contract with the UI)

- Commands: `init`, `get_states`, `saveconfig {config, reload}`, `quit`,
  `show_picker {currentPath}`, `generate_crypto`, `open_external {url}`.
- Events emitted to the UI: `state {server_states}`, `ipchange {ip}`, `reload`.
- Update checking now runs in the frontend (`fetch` to simplewebserver.org),
  allowed by the CSP `connect-src`.

## Options changed from the Electron version

- **Removed** from UI + config: `staticDirectoryListing`, `customErrorReplaceString`,
  `ipThrottling`, `htaccess`, and plugins (per issue #52 / owner decision).
- **`cacheControl`** — implemented in the Rust server.
- **`precompression`** toggle now enables gzip compression in the Rust server.

## macOS specifics (NEEDS ON-DEVICE VERIFICATION)

The macOS-only native code compiles only when targeting macOS; it could **not**
be compiled or run in the Linux CI used for this migration. Please build on a Mac
and verify / adjust:

- **`src-tauri/src/bookmarks.rs` (`mod mac`)** — security-scoped bookmarks via
  `objc2` / `objc2-app-kit` / `objc2-foundation`:
  - `run_open_panel` shows `NSOpenPanel`, creates a security-scoped bookmark for
    the chosen folder, and stores it (base64) in `bookmarks.json`.
  - `start_accessing` resolves the bookmark and calls
    `startAccessingSecurityScopedResource` (held for the process lifetime).
  - Spots most likely to need small API tweaks: `NSData::with_bytes`,
    `NSData::bytes()/length()` extraction, and the exact `MainThreadMarker` path.
- **Dock hiding** — `set_dock_visible` in `lib.rs` calls
  `NSApplication::setActivationPolicy(Accessory/Regular)`. This is the durable,
  no-fork approach for "hide dock icon in background."
- **Entitlements** — see `src-tauri/entitlements/`. For a **Mac App Store**
  build, point `tauri.conf.json > bundle > macOS > entitlements` at
  `entitlements/entitlements.mas.plist` (has `app-sandbox`,
  `files.user-selected.read-write`, `files.bookmarks.app-scope`,
  `network.server`, `network.client`). The `network.server` entitlement is
  required for the sandbox to allow listening sockets.
- **Install source** — `INSTALL_SOURCE` defaults to `"website"`. For store
  builds set the `SWS_INSTALL_SOURCE` env var at compile time (e.g.
  `macappstore`, `microsoftstore`) so update checks are skipped appropriately.

## Server behaviour vs the old Node/WSC server

Reviewed the old `WSC/handlers.js` against the Rust server. Ported fixes:

- **SPA fallback** now matches the old behaviour: the real path is served first
  and the app entry point (`rewriteTo` / `index.html`) is only used as a 404
  fallback. The initial Rust port rewrote *every* extensionless path to
  index.html, which shadowed real files and directories.
- **Range requests**: an open-ended range past EOF (`bytes=N-` with N ≥ size)
  no longer underflows the unsigned content-length; malformed `Range` headers
  (missing `=`/`-`) no longer panic the connection thread.
- **Empty files** return `200` with `Content-Length: 0` instead of hitting a
  `size - 1` underflow.

- **Compression** now matches the old server's two independent options:
  `precompression` (serve pre-existing `.gz`/`.br` files, default on, priority
  gzip→br) and `compression` (on-the-fly gzip→br→deflate, default off). Both are
  exposed in the UI; precompressed files take priority over on-the-fly.

Flagged differences (NOT changed — decide later):

- **OPTIONS**: old returned `403` when CORS was off; the Rust server returns
  `200`. Minor.
- **Index filename matching** is case-sensitive in Rust (`index.html`) vs
  case-insensitive in the old server — only matters on case-sensitive
  filesystems (Linux).

## Auto-updating (client is wired; you finish the server side)

The Tauri equivalent of electron-updater — `tauri-plugin-updater` — is set up on
the **client**, fully silent (no UI):

- On launch, `background_update` (in `lib.rs`, run on the async runtime) checks
  the endpoint and downloads any update in the background.
- **macOS/Linux**: it installs immediately (just swaps files) and the update
  applies on the **next launch** — nothing interrupts the session.
- **Windows**: the NSIS installer has to run and exit the app, so the update is
  only downloaded on launch and **installed when the user quits** (see
  `RunEvent::Exit`), so it never interrupts the current session.
- Store builds (macappstore/microsoftstore) skip it entirely.
- All outcomes are written to the log only — there are no popups.
- `tauri.conf.json > plugins.updater` has the endpoint and a public key.

To make it live you need to:

1. **Generate your own signing keypair** (the committed `pubkey` is a throwaway
   placeholder — the private key was discarded):
   ```sh
   npx @tauri-apps/cli signer generate -w ~/.tauri/simplewebserver.key
   ```
   Put the printed public key in `tauri.conf.json > plugins.updater.pubkey`, and
   keep the private key secret (a CI secret, `TAURI_SIGNING_PRIVATE_KEY` +
   `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`).
2. **Build signed artifacts** — with those env vars set, `tauri build` emits the
   updater artifacts plus `.sig` files.
3. **Host an update manifest** at the endpoint
   `https://simplewebserver.org/updater/{{target}}-{{arch}}/{{current_version}}`
   (adjust as you like). It returns JSON like:
   ```json
   {
     "version": "2.0.1",
     "notes": "…",
     "pub_date": "2025-01-01T00:00:00Z",
     "platforms": {
       "darwin-aarch64": { "signature": "<contents of .sig>", "url": "https://…/app.tar.gz" }
     }
   }
   ```
   The plugin returns "no update" for equal/older versions.

The website `/versions/*.json` banner check (`checkForUpdates`) is unchanged and
independent — it just links to a download page. You can keep both or drop the
banner once the in-app updater is live.

## Other follow-ups

- Tray uses the default app icon; a proper macOS template menubar icon can be
  wired in `create_tray`.
- Drag-and-drop folder selection is still a TODO (needs the file path, which the
  webview doesn't expose the same way Electron did).
