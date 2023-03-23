# Server Options

Option names correspond to the option key in config.json. See [Editing config.json](config%20file.md).

## Basic options

### Enabled

- Name: `enabled`
- Type: `true/false`
- Default: -

### Directory

- Name: `path`
- Type: path string
- Default: -

Directory to serve files from. If the directory is within a hidden folder, then make sure to enable [Serve hidden/dot files](#serve-hidden-dot-files).

### Port

- Name: `port`
- Type: number 1 - 65535
- Default: `8080`

Port that the local web server is accessible on. Access the website at `http://localhost:[PORT]`.

### Accessible on local network

- Name: `localnetwork`
- Type: `true/false`
- Default: `false`

Makes the web server accessible over LAN (local area network) to other computers on the network. Access it from another computer using the host computer's local IP address and the specified port. The LAN IP address is displayed in the app under web server URLs.

Enabling this option requires local network access. On Windows and macOS you may see a firewall permission prompt when enabling this option. You must allow access in order for the web server to work over LAN.

<figure>
  <img src='/images/windows_lan_warning.jpeg' style='width: 400px'>
  <figcaption>Firewall permission prompt on Windows</figcaption>
</figure>

<figure>
  <img src='/images/macos_lan_warning.jpeg' style='width: 250px'>
  <figcaption>Firewall permission prompt on macOS</figcaption>
</figure>

## Basic rules

### Automatically show index.html

- Name: `showIndex`
- Type: `true/false`
- Default: `true`

When no file path is specified, automatically serve `index.html` (if it exists).

### Single page rewrite (for SPAs)

- Name: `spa`
- Type: `true/false`
- Default: `false`

Automatically rewrite all paths that don't exist to a single page. For [Single Page Applications](https://developer.mozilla.org/en-US/docs/Glossary/SPA).

### Rewrite to (for SPAs)

- Name: `rewriteTo`
- Type: string
- Default: `/index.html`

If the Single page rewrite option is enabled, specify what file to rewrite to. For [Single Page Applications](https://developer.mozilla.org/en-US/docs/Glossary/SPA).

### Show directory listing

- Name: `directoryListing`
- Type: `true/false`
- Default: `true`

Show a list of files in the specified directory instead of a 404 page.

### Exclude .html extension

- Name: `excludeDotHtml`
- Type: `true/false`
- Default: `false`

Exclude .htm and .html extensions from URLs. For example, `/example.html` will redirect to `/example`. If a file exists at the path without an extension, the HTML file will still be rendered instead.

## Advanced rules

### Listen on IPV6

- Name: `ipv6`
- Type: `true/false`
- Default: `false`

Listen over IPV6 instead of the default, which is IPV4. This will change the web server URL(s) to be IPV6 instead of IPV4, however some IPV4 addresses will remain functional when LAN is enabled.

### Cache-Control header value

- Name: `cacheControl`
- Type: string
- Default: -

Optionally specify a custom `Cache-Control` HTTP header value. [Learn more about the Cache-Control header.](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

### Set CORS headers

- Name: `cors`
- Type: `true/false`
- Default: `false`

Allow cross origin requests. Sets `Access-Control-Allow-Origin` header to `*`, `Access-Control-Allow-Methods` to `GET, POST, PUT, DELETE`, and `Access-Control-Max-Age` to `120`. [Learn more about Cross-Origin Resource Sharing.](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

### Serve hidden/dot files

- Name: `hiddenDotFiles`
- Type: `true/false`
- Default: `false`

Allow requesting hidden/dot files. These are files or folders with names that begin with a `.` character.

### Allow file upload

- Name: `upload`
- Type: `true/false`
- Default: `false`

Allows PUT/POST requests. Includes hidden/dot files if they are enabled.

### Allow replacing files

- Name: `replace`
- Type: `true/false`
- Default: `false`

If file upload is enabled, allows replacing files that already exist. Includes hidden/dot files if they are enabled.

### Allow deleting files

- Name: `delete`
- Type: `true/false`
- Default: `false`

Allows DELETE requests. Includes hidden/dot files if they are enabled.

### Always use static directory listing

- Name: `staticDirectoryListing`
- Type: `true/false`
- Default: `false`

Disables JavaScript enhancement of the directory listing page.

### Show hidden/dot files in directory listing

- Name: `hiddenDotFilesDirectoryListing`
- Type: `true/false`
- Default: `true`

If hidden/dot files are enabled, determines if they will be shown in the directory listing. This includes `.swshtaccess` files.

### Enable .swshtaccess configuration files <Badge type="tip" text="Unfinished / May change" vertical="top" />

- Name: `htaccess`
- Type: `true/false`
- Default: `false`

You can use `.swshtaccess` files to set additional rules on a per-directory basis. See [Advanced configuration using .swshtaccess files](swsaccess.md).

## Error pages

### Custom 404 page file path

- Name: `custom404`
- Type: path string
- Default: -

File path to a custom 404 page. Will fallback to a generic 404 page if this value is empty or specified path is not valid.

### Custom 403 page file path

- Name: `custom403`
- Type: path string
- Default: -

File path to a custom 403 page. Will fallback to a generic 403 page if this value is empty or specified path is not valid.

### Custom 401 page file path

- Name: `custom401`
- Type: path string
- Default: -

File path to a custom 401 page. Will fallback to a generic 401 page if this value is empty or specified path is not valid.

::: tip
You can specify a custom file path for any error page in the config.json file. The app may check for the following error pages: 400, 401, 403, 404, 429, 500. See [Editing config.json](config%20file.md).
:::

### Custom error path variable

- Name: `customErrorReplaceString`
- Type: path string
- Default: -

Optionally specify a custom string that will be looked for in your error pages and replaced with the current path. For example, if your custom 404 page included: <span v-pre>`The file at {{PATH}} does not exist`</span> and you set this option to <span v-pre>`{{PATH}}`</span>, when your custom page is served it would say `The file at /example.txt does not exist`.

## Security

### Use HTTPS

- Name: `https`
- Type: `true/false`
- Default: `false`

Make server accessible over a secure connection (https) instead of http. Uses the same single port, so you cannot use both http and https at the same time. See [Using HTTPS](https.md).

### SSL/TLS certificate

- Name: `httpsCert`
- Type: string
- Default: -

Optionally override this option to provide a custom HTTPS certificate. See [Using HTTPS](https.md).

### SSL/TLS private key

- Name: `httpsKey`
- Type: string
- Default: -

Optionally override this option to provide a custom HTTPS private key. See [Using HTTPS](https.md).

### Enable HTTP Basic authentication

- Name: `httpAuth`
- Type: `true/false`
- Default: `false`

Require authentication using the HTTP Basic authentication protocol. Specify a username and password in the HTTP Basic auth username and HTTP Basic auth password options. If either the username or password option is missing or invalid, the web server will become inaccessible.

<figure>
  <img src='/images/http_basic_auth.jpeg' style='width: 400px'>
  <figcaption>HTTP authentication prompt in the browser.</figcaption>
</figure>

### HTTP Basic auth username

- Name: `httpAuthUsername`
- Type: string
- Default: -

Username for HTTP Basic authentication. Cannot contain a colon (`:`) character.

### HTTP Basic auth password

- Name: `httpAuthPassword`
- Type: string
- Default: -

Password for HTTP Basic authentication. Stored in plain text.

### Maximum connections per IP address

- Name: `ipThrottling`
- Type: number
- Default: `10`

Limits the number of incoming connections per IP address. Set to 0 for unlimited connections.