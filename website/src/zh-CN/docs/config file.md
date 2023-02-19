# Editing config.json

All server options and app settings are stored in one file, `config.json`. It's possible to manually edit this file to access options that aren't accessible from the user interface.

Options are stored in JSON format. You can find the name (key) and type of value for each option on the [Server Options](options.md) and [App Settings](settings.md) pages.

Changes made to this file while the program is running will take effect immediately. Changes will reload the app's user interface, which may cause you to lose unsaved changes.

:::warning
If you download the app from the Mac App Store, your web server may stop working if you change the `path` option directly from config.json. This is because the app only has permission to read from directories that have been selected using the open dialog in the app. To avoid this problem, only change the path from within the app.
:::

Here's where to find the config.json file:

**Windows:** `C:\Users\[USERNAME]\AppData\Roaming\Simple Web Server\config.json`

**macOS (Direct download):** `/Users/[USERNAME]/Library/Application Support/Simple Web Server/config.json`

**macOS (App Store):** `/Users/[USERNAME]/Library/Containers/org.simplewebserver.simplewebserver/Data/Library/Application Support/Simple Web Server/config.json`

**Linux:** **TODO**

Here's what the config file might look like:

```json
{
  "servers": [
    {
      "enabled": true,
      "path": "/Users/username/Documents/GitHub/website",
      "localnetwork": false,
      "index": true,
      "port": 8080,
      "cors": false,
      "showIndex": true,
      "spa": false,
      "rewriteTo": "/index.html",
      "directoryListing": true,
      "excludeDotHtml": false,
      "ipv6": false,
      "cacheControl": "",
      "hiddenDotFiles": false,
      "upload": false,
      "replace": false,
      "delete": false,
      "staticDirectoryListing": false,
      "hiddenDotFilesDirectoryListing": true,
      "htaccess": false,
      "custom404": "",
      "custom403": "",
      "custom401": "",
      "customErrorReplaceString": "",
      "https": false,
      "httpsCert": "",
      "httpsKey": "",
      "httpAuth": false,
      "httpAuthUsername": "",
      "httpAuthPassword": "",
      "ipThrottling": 10
    }
  ],
  "background": true,
  "updates": true,
  "theme": "system"
}
```