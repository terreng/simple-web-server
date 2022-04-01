# Server Options

## Basic options

### Enabled

- Name: `enabled`
- Type: `true/false`
- Default: -

Whether the server is turned on or not

### Directory

- Name: `path`
- Type: path string
- Default: -

Directory to serve files from

### Port

- Name: `port`
- Type: number 1 - 65535
- Default: `8080`

Port that server is accessible on

### Accessible on local network

- Name: `localnetwork`
- Type: `true/false`
- Default: `false`

Makes the web server accessible over LAN to other computers on the network. Access using this computer's local IP address.

## Basic rules

### Automatically show index.html

- Name: `showIndex`
- Type: `true/false`
- Default: `true`

Automatically serve index.html file, if it exists, when no file path is specified

### Single page rewrite (for SPAs)

- Name: `spa`
- Type: `true/false`
- Default: `false`

Automatically rewrite all paths that don't exist to a single page. For Single Page Applications.

### Rewrite to (for SPAs)

- Name: `rewriteTo`
- Type: `string`
- Default: `/index.html`

If the Single page rewrite option is enabled, specify where to redirect to. For Single Page Applications.

### Show directory listing

- Name: `directoryListing`
- Type: `true/false`
- Default: `true`

Show a list of files in the specified directory instead of a 404 page

### Exclude .html extension

- Name: `excludeDotHtml`
- Type: `true/false`
- Default: `false`

Exclude .htm and .html extensions from URLs. For example, /example.html will redirect to /example. If a file exists at the path without an extension, the html file will still be rendered instead.

## Advanced rules

### Cache-Control header value

- Name: `cacheControl`
- Type: `string`
- Default: -

Optionally specify a custom Cache-Control HTTP header value.

### Set CORS headers

- Name: `cors`
- Type: `true/false`
- Default: `false`

Allow cross origin requests. Sets `Access-Control-Allow-Origin` header to `*`, `Access-Control-Allow-Methods` to `GET, POST, PUT, DELETE`, and `Access-Control-Max-Age` to `120`.
<!-- This option is not accessible from the UI
### HTTP compression

- Name: `compression`
- Type: `true/false`
- Default: `false`

Serve files with compression. Only works for supported browsers. This reduces network data usage, but may slow down the server on low-end computers. Supports gzip, Brotli, and deflate compression formats.-->

### Serve hidden/dot files

- Name: `hiddenDotFiles`
- Type: `true/false`
- Default: `false`

Allow requesting hidden/dot files. Also enables creating, modifying, and deleting them, if enabled.

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

Disables JavaScript on the directory listing page.

### Show hidden/dot files in directory listing

- Name: `hiddenDotFilesDirectoryListing`
- Type: `true/false`
- Default: `true`

If hidden/dot files are enabled, determines if they will be shown in the directory listing. This includes .swshtaccess files.

### Enable .swshtaccess configuration files

- Name: `htaccess`
- Type: `true/false`
- Default: `false`

You can use .swshtaccess files to set additional rules per directory. To learn more, see [Advanced configuration using .swshtaccess files](swsaccess.md).

## Error pages

### Custom 404 page file path

- Name: `custom404`
- Type: path string
- Default: -

File path to a custom 404 page. Will fallback to default 404 page if value is empty or file does not exist.

### Custom 403 page file path

- Name: `custom403`
- Type: path string
- Default: -

File path to a custom 403 page. Will fallback to default 403 page if value is empty or file does not exist.

### Custom 401 page file path

- Name: `custom401`
- Type: path string
- Default: -

File path to a custom 401 page. Will fallback to default 401 page if value is empty or file does not exist.

::: tip
You can specify a custom file path for any error page in the config.json file. The app may check for the following error pages: 400, 401, 403, 404, 429, 500.
:::

### Custom error path variable

- Name: `customErrorReplaceString`
- Type: path string
- Default: -

Optionally specify a custom string that will be looked for in your error pages and replaced with the current path. For example, if your custom 404 page included: <span v-pre>`The file at {{PATH}} does not exist`</span> and you set this option to <span v-pre>`{{PATH}}`</span>, when your file is served it would say `The file at /example.txt does not exist`.

## Security

### Use HTTPS

- Name: `https`
- Type: `true/false`
- Default: `false`

Make server accessible over a secure connection (https) instead of http. Uses the same single port, so you cannot use both http and https at the same time.

### SSL/TLS cerificate

- Name: `httpsCert`
- Type: string
- Default: -

Optionally override this option to provide a custom HTTPS certificate.

### SSL/TLS private key

- Name: `httpsKey`
- Type: string
- Default: -

Optionally override this option to provide a custom HTTPS private key.

::: tip
For more information on how to configure HTTPS with a custom certificate, see [Configuring HTTPS](https.md).
:::

### Enable HTTP Basic authentication

- Name: `httpAuth`
- Type: `true/false`
- Default: `false`

Require authentication using the basic HTTP protocol. Specify a username and password in the httpAuthUsername and httpAuthPassword options. If either option is missing or invalid, the web server will become inaccessible.

### HTTP Basic auth username

- Name: `httpAuthUsername`
- Type: string
- Default: -

Username for HTTP Basic authentication. Cannot contain `:`.

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