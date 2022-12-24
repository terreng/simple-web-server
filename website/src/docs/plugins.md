# Introduction to plugins

Plugins allow you to further modify your web servers beyond the options that are available in the app. After installing a plugin, you must specifically enable it for each server you want to use it with.

:::danger
Plugins aren't sandboxed, and run with the same permissions as the app. Only install plugins if you know and trust the developer.
:::

## Community plugins

- [Web Proxy](https://github.com/ethanaobrien/web-proxy) by [@ethanaobrien](https://github.com/ethanaobrien) (Co-creator of Simple Web Server)

Have you made a plugin that you want to share? [Open an issue on GitHub](https://github.com/terreng/simple-web-server/issues) to request that we add it to this list.

## Creating a plugin

### Step 1: Create a plugin manifest file

To get started, create a new folder for your plugin. In the folder, create a new file called `plugin.json`. Use this file to specify the name of your plugin, a unique id, any configurable options, and the name of the script file it runs.

See [Plugin manifest file](/docs/plugin%20manifest%20file.md) for a complete guide on this file.

**Example plugin.json file**

```json
{
  "name": "My Plugin",
  "id": "myplugin",
  "script": "script.js",
  "options": [
    {
      "id": "header",
      "name": "Add custom header",
      "description": "Enable this option to add a custom header to each response",
      "type": "bool",
      "default": false
    }
  ]
}
```

### Step 2: Create a plugin script

Create a JavaScript file with a name that matches the value of the `script` option in your `plugin.json` file, such as `script.js`.

The script can have two custom functions:
- `onStart(server, options)`, which is called whenever the server starts and allows you to modify the server.
- `onRequest(req, res, options, preventDefault)`, which is called with each request and allows you modify the response or handle the request however you want.

See [Plugin script](/docs/plugin%20script.md) for a more details, including an explanation of the arguments to these functions.

**Example script file**

```javascript
function onStart(server, options) {
  // Do nothing
}

function onRequest(req, res, options, preventDefault) {
  if (options.header == true) {
    res.setHeader('my-header', 'hello world');
  }
}

module.exports = {onStart, onRequest};
```

### Step 3: Install the plugin

To install a plugin from the app, go to Settings > Add Plugin and choose the directory your plugin files are located in. You can also install a plugin from a ZIP file.

Alternatively, you can manually install a plugin by adding it to the plugins directory:

**Windows:** `C:\Users\[USERNAME]\AppData\Roaming\Simple Web Server\plugins\`

**macOS (Direct download):** `/Users/[USERNAME]/Library/Application Support/Simple Web Server/plugins/`

**macOS (App Store):** `/Users/[USERNAME]/Library/Containers/org.simplewebserver.simplewebserver/Data/Library/Application Support/Simple Web Server/plugins/`

**Linux:** **TODO**

The name of the folder must match the id of the plugin.

### Step 4: Debug any issues

If you see an error about the `plugin.json` file being invalid then check to make sure that you've formatted it correctly. See [Plugin manifest file](/docs/plugin%20manifest%20file.md) for more help.

If you encounter an "Error starting plugins" error for a server, or if you receive a `Plugin error` error message in response to a web request, then check the logs for more error details. See [Viewing logs](logs.md).

If your plugin isn't working and you aren't sure why, consider adding `console.log` statements to your code to help debug. See [Viewing logs](logs.md).