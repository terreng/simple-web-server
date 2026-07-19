# Running & testing locally (macOS + Windows)

This repo contains everything **except** the generated native app shells (the
Xcode project and the Visual Studio solution), because those must be generated on
a Mac / Windows machine. You do that **once per platform**, drop our code in, and
from then on it's a normal `run-macos` / `run-windows` loop.

Everything below is exact. Where a value depends on your paths, it's written
relative to the `app/` directory.

---

## 0. Common prerequisites (both platforms)

- **Node.js 18+** and **npm**
- **Rust** (stable) via <https://rustup.rs>, plus a C toolchain for the vendored
  OpenSSL:
  - macOS: Xcode command-line tools (`xcode-select --install`) — provides `cc`,
    `perl`, `make`.
  - Windows: **Visual Studio 2022** with "Desktop development with C++", plus
    **NASM** (`choco install nasm` or <https://www.nasm.us>) and Perl
    (Strawberry Perl) — required to build OpenSSL.

Then, once:

```sh
cd app
npm install
npm run tsc        # optional sanity check — should pass
```

---

## 1. macOS

### 1a. Generate the macOS app shell (once)

From `app/`:

```sh
npx react-native-macos-init
```

This creates `app/macos/…` including `SimpleWebServer.xcworkspace`,
`SimpleWebServer.xcodeproj`, `Podfile`, and an app-target source folder. Then:

```sh
cd macos && pod install && cd ..
```

> Our native sources already live in `app/macos/SimpleWebServer/` — the init step
> writes its project files around them; it does not delete them.

### 1b. Build the Rust core (once, and after any Rust change)

```sh
# from app/
npm run rust:build            # -> rust-server/target/release/libsws_ffi.a
```

### 1c. Wire our code into the Xcode project (once)

Open `app/macos/SimpleWebServer.xcworkspace` in Xcode, select the
**SimpleWebServer** app target, then:

1. **Add files** (right-click the target group → *Add Files to
   "SimpleWebServer"…*, uncheck "Copy items if needed"):
   - everything in `app/macos/SimpleWebServer/*.{h,mm}`
     (SWSAppCore, SWSConfigStore, SWSBookmarks, SWSUpdater, ServerManagerModule)
   - `app/native-common/SwsSupervisor.hpp` and `SwsSupervisor.cpp`
2. **Build Settings** (on the app target):
   - **Header Search Paths** →
     `$(SRCROOT)/../native-common` and `$(SRCROOT)/../rust-server/ffi/include`
   - **Library Search Paths** → `$(SRCROOT)/../rust-server/target/release`
   - **Other Linker Flags** → `-lsws_ffi`
3. **Build Phases → New Run Script Phase** (drag it **above** "Compile Sources"):
   ```sh
   cd "$SRCROOT/.." && npm run rust:build
   ```
   (keeps the static lib fresh; safe to skip if you always run 1b by hand.)

That's all that's needed for a functional run — the `ServerManagerModule`
auto-registers (it uses `RCT_EXPORT_MODULE`) and servers auto-start on first UI
load.

### 1d. Run

```sh
# from app/
npm run macos
```

or press ▶ in Xcode. Metro starts automatically; if not: `npm start` in another
terminal.

### 1e. (Optional) background mode + menu-bar icon

To get "keep running when the window is closed" with the dock icon hidden, merge
the pieces from `app/macos/SimpleWebServer/AppDelegate.reference.mm` into the
generated `AppDelegate` (it adds `[[SWSAppCore shared] start]` and the
window-close / dock / menu-bar handling). Not required just to serve.

### 1f. (Optional) auto-update

Add Sparkle 2 (SPM or CocoaPods) and set `SUFeedURL` / `SUPublicEDKey` in
Info.plist — see [UPDATER.md](UPDATER.md).

---

## 2. Windows

### 2a. Generate the Windows app shell (once)

From `app/` (PowerShell or CMD):

```powershell
npx react-native init-windows --template cpp-app --overwrite
```

> If your react-native-windows version doesn't provide `init-windows`, use the
> older `npx react-native-windows-init --overwrite --language cpp`. This creates
> `app/windows/SimpleWebServer.sln` + the app project. Our sources stay in
> `app/windows/ServerManager/`.

### 2b. Build the Rust core (once, and after any Rust change)

```powershell
# from app/
npm run rust:build   # -> rust-server\target\release\sws_ffi.dll(+.dll.lib)
```

### 2c. Wire our code into the VS project (once)

Open `app/windows/SimpleWebServer.sln` in Visual Studio 2022. In the
**SimpleWebServer** app project:

1. **Add existing items:**
   - `app/windows/ServerManager/*.{h,cpp}`
     (AppCore, ConfigStore, ServerManager, SWSUpdater)
   - `app/native-common/SwsSupervisor.{hpp,cpp}`
2. **SwsSupervisor.cpp** does not use the precompiled header — in its file
   properties set **C/C++ → Precompiled Headers → Not Using Precompiled
   Headers**. (AppCore.cpp / ConfigStore.cpp / SWSUpdater.cpp `#include "pch.h"`;
   make sure the project's `pch.h` includes what `ServerManager/pch.reference.h`
   lists.)
3. **Project Properties** (all configs, x64):
   - **C/C++ → General → Additional Include Directories** →
     `$(ProjectDir)..\..\native-common;$(ProjectDir)..\..\rust-server\ffi\include`
   - **Linker → General → Additional Library Directories** →
     `$(ProjectDir)..\..\rust-server\target\release`
   - **Linker → Input → Additional Dependencies** →
     `sws_ffi.dll.lib;iphlpapi.lib;ws2_32.lib`
   - **Build Events → Post-Build Event** →
     `copy /Y "$(ProjectDir)..\..\rust-server\target\release\sws_ffi.dll" "$(OutDir)"`
4. **Register the module.** Add `#include "ServerManager.h"` near the top of the
   app's `ReactPackageProvider.cpp` (so the `REACT_MODULE` macro is compiled).
   The cpp-app template's `ReactPackageProvider` already calls
   `AddAttributedModules(...)`, which then picks up `ServerManager`.

Servers auto-start on first UI load (the module calls `AppCore::start()` in its
initializer).

### 2d. Run

```powershell
# from app/
npm run windows
```

### 2e. (Optional) background mode + tray

Wire `app/windows/ServerManager/TrayBackground.reference.cpp` into the app's main
window (subclass its HWND, call `SwsInitTrayBackground(hwnd)` after creation) to
get hide-on-close + the system-tray icon. Not required just to serve.

### 2f. (Optional) auto-update

Add WinSparkle (NuGet/vcpkg), ship `WinSparkle.dll`, and set the feed URL + key —
see [UPDATER.md](UPDATER.md).

---

## 3. What to test

1. **Create a server** → New Server → choose a folder, pick a port → Create.
   The row should show **Running** and a URL; click it (or open
   `http://localhost:<port>`) and confirm your files serve.
2. **Multiple servers** — add a second on a different port; both run
   independently. Add one on a port already in use → it shows the **Port in use**
   error panel.
3. **Live state sync** — toggle a server off/on from the list; the state chip and
   URLs update immediately.
4. **Edit an option** — e.g. turn on Directory listing or HTTPS; save; the server
   restarts and behavior changes (HTTPS → `https://…`, self-signed cert).
5. **Backwards compat** — copy an old install's `config.json` into the data dir
   (macOS `~/Library/Application Support/Simple Web Server/`, Windows
   `%APPDATA%\Simple Web Server\`) before launch; your existing servers should
   appear and run (removed options are dropped silently).
6. **Background mode** (after 1e / 2e) — enable "Keep running when closed", close
   the window; the server keeps serving. Reopen via the tray/menu-bar icon or by
   relaunching.
7. **Auto-update** (after 1f / 2f) — Settings → "Check for updates now" reaches
   your appcast feed.

---

## 4. Troubleshooting

- **"Native module ServerManager is not available"** — the module files aren't
  compiled into the app target (macOS 1c step 1) or not registered (Windows 2c
  step 4).
- **Linker can't find `sws_ffi`** — you didn't run `npm run rust:build`, or the
  Library Search Path / Additional Library Directories don't point at
  `rust-server/target/release`.
- **Windows: app runs but can't serve / crashes on start** — `sws_ffi.dll` isn't
  next to the exe; check the post-build copy (2c step 3).
- **OpenSSL build fails** — missing NASM/Perl (Windows) or command-line tools
  (macOS); see §0.
- **RN platform version mismatch** — keep `react-native`,
  `react-native-macos`, and `react-native-windows` on the same 0.77.x line
  (see `package.json`).
- **Sanity-check the native core alone** (no GUI needed):
  `bash scripts/verify-core.sh` (macOS) / `scripts/verify-core.ps1` (Windows).
