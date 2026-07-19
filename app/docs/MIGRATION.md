# Upgrading from the Electron version

**Short answer: yes, it's backwards compatible.** A user updating from the old
Electron app keeps their servers and settings — the new app reads the same
`config.json`, in the same place, and understands the old keys.

## Same config file, same location

`config.json` lives in the per-user app-data directory keyed by the app's
name/id, which are unchanged:

| Platform / channel | Path |
| --- | --- |
| macOS (direct download) | `~/Library/Application Support/Simple Web Server/config.json` |
| macOS (App Store, sandboxed) | the app's container `…/Library/Application Support/Simple Web Server/config.json` |
| Windows (direct download) | `%APPDATA%\Simple Web Server\config.json` |

For this to line up, the v2 app must keep the **same identity** as the Electron
build:

- macOS: `CFBundleName` = `Simple Web Server`, bundle id
  `org.simplewebserver.simplewebserver` (so the sandbox container matches on
  MAS). `SWSConfigStore` reads `Application Support/<CFBundleName>`.
- Windows (unpackaged): dir name `Simple Web Server` (hard-coded in
  `ConfigStore`), matching Electron's `%APPDATA%\<productName>`.

> Cross-channel moves (e.g. Store ↔ direct download) never shared a config in the
> Electron version either, because the sandbox/packaged data dirs differ. Staying
> on the same channel migrates seamlessly.

## Schema compatibility

The per-server keys are unchanged in name, so old entries load as-is. On first
launch, `migrateConfig()` (see `src/util/config.ts`) normalizes each server:

- **Retained** keys keep their values (`path`, `port`, `spa`, `https`,
  `httpAuth…`, `custom401/403/404`, etc.).
- **Removed** keys are dropped: `htaccess`, `plugins`, `ipThrottling`,
  `customErrorReplaceString`, `staticDirectoryListing`, `precompression`,
  `cacheControl`. (These features don't exist in the Rust core.)
- **New** keys get defaults: `custom500` → `""`.

The normalized config is written back once, so the file is quietly upgraded and
the UI/native views agree (important because running servers are matched to
config entries by full-config equality).

Global settings (`background`, `updates`, `tray`, `theme`, `language`,
`ignore_update`) carry over unchanged.

## Behavior changes to expect

- Servers that relied on a **removed** feature (e.g. `.swshtaccess`, plugins,
  per-IP throttling, precompressed `.gz/.br`) will run without that behavior.
- Custom error pages still work (`custom401/403/404`, plus the new `500`), but
  the `customErrorReplaceString` token substitution is gone.
