# Editing config.json

All server options and app settings are stored in one file, `config.json`. It's possible to manually edit this file to access options that aren't accessible from the user interface.

:::warning
Currently, the app only reads from config.json once, at startup. Any changes you make to config.json while the app is running won't have any effect, and may be overwritten. You should close the app while manually editing config.json, and reopen it once you are done.
:::

Options are stored in JSON format. You can find the name (key) and type of value for each option on the [Server Options](options.md) and [App Settings](settings.md) pages.

Here's where to find the config.json file:

**Windows:** `C:\Users\[USERNAME]\AppData\Roaming\Simple Web Server\config.json`

**macOS:** `/Users/[USERNAME]/Library/Application Support/Simple Web Server/config.json`

**Linux:** **TODO**