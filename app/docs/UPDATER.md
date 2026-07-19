# Auto-update

React Native has no built-in desktop auto-updater, so each platform uses a
native one. Both are driven by a signed **appcast** feed, so the server side is
symmetric.

## Options considered

**macOS**

| Option | Verdict |
| --- | --- |
| **Sparkle 2** | ✅ Chosen. The de-facto macOS updater: signed (EdDSA) appcast, background checks, delta updates, mature. |
| MAS auto-update | Used implicitly on the App Store build — there is no self-updater there, the store updates the app. We disable Sparkle when sandboxed. |

**Windows**

| Option | Verdict |
| --- | --- |
| **WinSparkle** | ✅ Chosen. A near drop-in analog of Sparkle (same appcast model), tiny C API, and it works with the existing NSIS/MSI installer — distribution doesn't change. |
| Squirrel.Windows | What Electron used; delta updates but finicky and tied to its own packaging. |
| Velopack | Modern, cross-platform, great UX + delta — but changes packaging (`vpk pack`). Good future option if you want one tool for both OSes. |
| MSIX `.appinstaller` | Only for packaged/Store distribution; used implicitly on the Store build. |

Net: **Sparkle + WinSparkle** — one appcast concept, minimal native code, and
self-update is disabled on the store builds (MAS / MSIX) where the store owns
updates.

## How it's wired

- The existing **"Check for updates"** setting (`config.updates`) toggles
  automatic background checks: the app core calls
  `setAutomaticChecksEnabled(config.updates)` at launch and whenever config is
  saved.
- A **"Check for updates now"** button appears in Settings when a self-updater is
  active (`updaterAvailable` from `getInitialState`; false on MAS/Store). It
  calls `ServerManager.checkForUpdates()`.
- Native entry points:
  - macOS `SWSUpdater` → Sparkle `SPUStandardUpdaterController`
    (`app/macos/SimpleWebServer/SWSUpdater.mm`).
  - Windows `sws::Updater` → WinSparkle
    (`app/windows/ServerManager/SWSUpdater.cpp`).
- Both files compile **with or without** the library present (`__has_include`),
  so the app builds before you add the dependency; `available()` is just false
  until then.

## Adding the libraries (build side)

**macOS (Sparkle 2)** — add via Swift Package Manager or CocoaPods to the
non-MAS target only. In `Info.plist`:

```xml
<key>SUFeedURL</key>            <string>https://simplewebserver.org/appcast-mac.xml</string>
<key>SUPublicEDKey</key>        <string>PASTE_SPARKLE_ED25519_PUBLIC_KEY</string>
<key>SUEnableAutomaticChecks</key> <true/>
```

Generate keys with Sparkle's `generate_keys`; keep the private key offline.

**Windows (WinSparkle)** — add via NuGet (`WinSparkle`) or vcpkg; ship
`WinSparkle.dll` next to the exe. The feed URL is set in
`SWSUpdater.cpp` (`kAppcastUrl`); set the EdDSA public key with
`win_sparkle_set_eddsa_public_key(...)` (uncomment the line and paste your key).

## Server side (placeholder — to implement)

You host two appcast XML files and sign each release:

- `https://simplewebserver.org/appcast-mac.xml`
- `https://simplewebserver.org/appcast-win.xml`

Each is a small RSS feed listing the latest version, download URL, length, and
an EdDSA signature of the artifact. Example item:

```xml
<item>
  <title>Version 2.1.0</title>
  <sparkle:version>2.1.0</sparkle:version>
  <enclosure url="https://.../Simple-Web-Server-macOS-2.1.0.dmg"
             sparkle:edSignature="BASE64_SIGNATURE"
             length="12345678" type="application/octet-stream" />
</item>
```

Release flow (per platform): build + sign the installer → sign the artifact with
the Sparkle/WinSparkle **private** key → update the appcast → publish. This
signing/hosting is intentionally left as a server-side placeholder; the client
integration above is complete and gated behind the feed URL + public key.

> The old version-check *banner* (a link to the download page) is superseded by
> the real updater on the direct-download builds. The `update` event hook remains
> in the bridge if you want to keep a banner on the store builds; wiring the
> HTTP version check into the app core is left as a follow-up.
