# Options & config mapping

`config.json` keeps the Electron shape so existing files migrate as-is, minus
the options removed in the Rust rewrite and plus `custom500`.

## Global settings

| Key | Meaning |
| --- | --- |
| `servers` | Array of server configs (below) |
| `background` | Keep running with the window closed (no dock/taskbar icon) |
| `tray` | Show a menu-bar (macOS) / system-tray (Windows) icon |
| `updates` | Check for updates (hidden/forced-off on the Mac App Store) |
| `theme` | `system` \| `light` \| `dark` |
| `language` | Locale code (`en`, `fr`, `zh-Hant`, …) |
| `ignore_update` | Version string the user dismissed |

## Per-server config → Rust `SwsSettings`

| config.json key | `SwsSettings` field | Notes |
| --- | --- | --- |
| `enabled` | — | UI/reconcile only (whether to run) |
| `path` | `path` | Folder to serve |
| `port` | `port` | |
| `localnetwork` | `local_network` | Binds `0.0.0.0`/`::` vs loopback |
| `showIndex` | `index` | Auto-serve index.html |
| `spa` | `spa` | |
| `rewriteTo` | `rewrite_to` | |
| `directoryListing` | `directory_listing` | |
| `excludeDotHtml` | `exclude_dot_html` | |
| `ipv6` | `ipv6` | |
| `hiddenDotFiles` | `hidden_dot_files` | |
| `cors` | `cors` | |
| `upload` | `upload` | PUT |
| `replace` | `replace` | |
| `delete` | `delete_files` | DELETE (renamed — `delete` is a C++ keyword) |
| `hiddenDotFilesDirectoryListing` | `hidden_dot_files_directory_listing` | |
| `custom401` | `custom401` | |
| `custom403` | `custom403` | |
| `custom404` | `custom404` | |
| `custom500` | `custom500` | **New** in the Rust core |
| `https` | `https` | |
| `httpsCert` | `https_cert` | |
| `httpsKey` | `https_key` | |
| `httpAuth` | `http_auth` | |
| `httpAuthUsername` | `http_auth_username` | |
| `httpAuthPassword` | `http_auth_password` | |

## Removed vs. the Electron version

Dropped from the UI and config (not supported by the Rust core, per
[issue #52](https://github.com/terreng/simple-web-server/issues/52)):

- `.swshtaccess` (`htaccess`) and **plugins** — removed by design.
- `ipThrottling`, `customErrorReplaceString`, `staticDirectoryListing`,
  `precompression`, `cacheControl` — dropped in the option revision.

Old config files containing these keys still load fine; the extra keys are
ignored. (Note: because reconcile matches servers by full-config equality, the
UI writes only the retained keys, so a running server's stored config is the
clean v2 shape.)
