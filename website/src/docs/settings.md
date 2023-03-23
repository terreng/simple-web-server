# App Settings

## App Settings

Option names correspond to the option key in config.json. See [Editing config.json](config%20file.md).

### Language

- Name: `language`
- Type: string, `en`, `zh_CN`, or `ru`

Supported languages:
- `en`: English
- `zh_CN`: Simplified Chinese (简体中文)
- `ru`: Russian (Русский)
- [Help us translate](https://github.com/terreng/simple-web-server/issues/124)

If the `language` option is missing or invalid, the app will automatically detect the system language.

### Keep running when closed

- Name: `background`
- Type: `true/false`
- Default: `false`

When enabled, the app will continue to run web servers in the background even when the window is closed. To stop the program while this option is enabled, click the "Stop & Quit" button.

### Show icon in system tray/menu bar

- Name: `tray`
- Type: `true/false`
- Default: `false`

When enabled, adds a shortcut icon to the system tray or menu bar area whenever Simple Web Server is running.

### Check for updates

- Name: `updates`
- Type: `true/false`

Periodically check if there is a new version of the app available. Updates are not automatically installed.

This option is not available if you download the app from the Mac App Store.

### Appearance

- Name: `theme`
- Type: string: `system`, `light`, or `dark`
- Default: `system`

Change appearance (light/dark theme). By default the app follows your system theme. Set to `light` or `dark` to override.

### Local logging <Badge type="tip" text="Hidden" vertical="top" />

- Name: `log`
- Type: `true/false`
- Default: `false`

Set this option to `true` to enable logging of all requests and any errors to a local log file. See [Viewing logs](/docs/logs.md). This option is not accessible from the app. See [Editing config.json](/docs/config%20file.md).