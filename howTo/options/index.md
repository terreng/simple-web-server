<h4><a href="../">Documentation</a>  /  Server Options</h4>

# Server Options

## Basic options
<table>
    <tbody>
        <tr>
            <td>
                <b>Option</b>
            </td>
            <td>
                <b>Name</b>
            </td>
            <td>
                <b>Value</b>
            </td>
            <td>
                <b>Default</b>
            </td>
            <td>
                <b>Description</b>
            </td>
        </tr>
        <tr>
            <td>
                Enabled
            </td>
            <td>
                <code>enabled</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                -
            </td>
            <td>
                Whether the server is turned on or not
            </td>
        </tr>
        <tr>
            <td>
                Directory
            </td>
            <td>
                <code>path</code>
            </td>
            <td>
                path string
            </td>
            <td>
                -
            </td>
            <td>
                Directory to serve files from
            </td>
        </tr>
        <tr>
            <td>
                Port
            </td>
            <td>
                <code>port</code>
            </td>
            <td>
                number 1 - 65535
            </td>
            <td>
                8080
            </td>
            <td>
                Port that server is accessible on
            </td>
        </tr>
        <tr>
            <td>
                Accessible on local network
            </td>
            <td>
                <code>localnetwork</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Makes the web server accessible over LAN to other computers on the network. Access using this computer's local IP address.
            </td>
        </tr>
    </tbody>
</table>

## Basic rules
<table>
    <tbody>
        <tr>
            <td>
                <b>Option</b>
            </td>
            <td>
                <b>Name</b>
            </td>
            <td>
                <b>Value</b>
            </td>
            <td>
                <b>Default</b>
            </td>
            <td>
                <b>Description</b>
            </td>
        </tr>
        <tr>
            <td>
                Automatically show index.html
            </td>
            <td>
                <code>showIndex</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                true
            </td>
            <td>
                Automatically serve index.html file when no file path is specified
            </td>
        </tr>
        <tr>
            <td>
                Single page rewrite (for SPAs)
            </td>
            <td>
                <code>spa</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Automatically rewrite all paths that don't exist to a single page. For Single Page Applications.
            </td>
        </tr>
        <tr>
            <td>
                Rewrite to (for SPAs)
            </td>
            <td>
                <code>rewriteTo</code>
            </td>
            <td>
                string
            </td>
            <td>
                /index.html
            </td>
            <td>
                If the Single page rewrite option is enabled, specify where to redirect to. For Single Page Applications.
            </td>
        </tr>
        <tr>
            <td>
                Show directory listing
            </td>
            <td>
                <code>directoryListing</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                true
            </td>
            <td>
                Show a list of files in the specified directory instead of a 404 page
            </td>
        </tr>
        <tr>
            <td>
                Exclude .html extension
            </td>
            <td>
                <code>excludeDotHtml</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Exclude .htm and .html extensions from URLs. For example, forwards /example.html to /example. If a file exists at the path without an extension, the html file will still be rendered instead.
            </td>
        </tr>
    </tbody>
</table>

## Advanced rules
<table>
    <tbody>
        <tr>
            <td>
                <b>Option</b>
            </td>
            <td>
                <b>Name</b>
            </td>
            <td>
                <b>Value</b>
            </td>
            <td>
                <b>Default</b>
            </td>
            <td>
                <b>Description</b>
            </td>
        </tr>
        <tr>
            <td>
                Cache-Control header value
            </td>
            <td>
                <code>cacheControl</code>
            </td>
            <td>
                string
            </td>
            <td>
                -
            </td>
            <td>
                Optionally specify a custom Cache-Control HTTP header value.
            </td>
        </tr>
        <tr>
            <td>
                Serve hidden/dot files
            </td>
            <td>
                <code>hiddenDotFiles</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Allow requesting hidden/dot files. Also enables creating, modifying, and deleting them, if enabled.
            </td>
        </tr>
        <tr>
            <td>
                Set CORS headers
            </td>
            <td>
                <code>cors</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Allow cross origin requests. Sets Access-Control-Allow-Origin header to *, Access-Control-Allow-Methods to GET, POST, PUT, DELETE, and Access-Control-Max-Age to 120.
            </td>
        </tr>
        <tr>
            <td>
                Allow file upload
            </td>
            <td>
                <code>upload</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Allows PUT/POST requests. Includes hidden/dot files if they are enabled.
            </td>
        </tr>
        <tr>
            <td>
                Allow replacing files
            </td>
            <td>
                <code>replace</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                If file upload is enabled, allows replacing files that already exist. Includes hidden/dot files if they are enabled.
            </td>
        </tr>
        <tr>
            <td>
                Allow deleting files
            </td>
            <td>
                <code>delete</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Allows DELETE requests. Includes hidden/dot files if they are enabled.
            </td>
        </tr>
        <tr>
            <td>
                Always use static directory listing
            </td>
            <td>
                <code>staticDirectoryListing</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Disables JavaScript on the directory listing page, if it's enabled.
            </td>
        </tr>
        <tr>
            <td>
                Show hidden/dot files in directory listing
            </td>
            <td>
                <code>hiddenDotFilesDirectoryListing</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                true
            </td>
            <td>
                If hidden/dot files are enabled, determines if they will be shown in the directory listing. This includes .swshtaccess files.
            </td>
        </tr>
        <tr>
            <td>
                Enable .swshtaccess configuration files
            </td>
            <td>
                <code>htaccess</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                You can use .swshtaccess files to set additional rules per directory. Learn more here.
            </td>
        </tr>
    </tbody>
</table>

TODO: Mention that you can do page for any error. 403, 404, 429, 400, 401, 500

## Error Pages
<table>
    <tbody>
        <tr>
            <td>
                <b>Option</b>
            </td>
            <td>
                <b>Name</b>
            </td>
            <td>
                <b>Value</b>
            </td>
            <td>
                <b>Default</b>
            </td>
            <td>
                <b>Description</b>
            </td>
        </tr>
        <tr>
            <td>
                Custom 404 page file path
            </td>
            <td>
                <code>custom404</code>
            </td>
            <td>
                path string
            </td>
            <td>
                -
            </td>
            <td>
                File path to a custom 404 page. Will fallback to default 404 page if value is empty or file does not exist.
            </td>
        </tr>
        <tr>
            <td>
                Custom 403 page file path
            </td>
            <td>
                <code>custom403</code>
            </td>
            <td>
                path string
            </td>
            <td>
                -
            </td>
            <td>
                File path to a custom 403 page. Will fallback to default 404 page if value is empty or file does not exist.
            </td>
        </tr>
        <tr>
            <td>
                Custom 401 page file path
            </td>
            <td>
                <code>custom401</code>
            </td>
            <td>
                path string
            </td>
            <td>
                -
            </td>
            <td>
                File path to a custom 401 page. Will fallback to default 404 page if value is empty or file does not exist.
            </td>
        </tr>
        <tr>
            <td>
                Custom error path variable
            </td>
            <td>
                <code>customErrorReplaceString</code>
            </td>
            <td>
                string
            </td>
            <td>
                -
            </td>
            <td>
                Optionally specify a custom string that will be looked for in your error pages and replaced with the current path. For example, if your custom 404 page included: "The file at {{PATH}} does not exist" and you set this option to "{{PATH}}", when your file is served it would say "The file at /example.txt does not exist".
            </td>
        </tr>
    </tbody>
</table>

## Security
<table>
    <tbody>
        <tr>
            <td>
                <b>Option</b>
            </td>
            <td>
                <b>Name</b>
            </td>
            <td>
                <b>Value</b>
            </td>
            <td>
                <b>Default</b>
            </td>
            <td>
                <b>Description</b>
            </td>
        </tr>
        <tr>
            <td>
                Use HTTPS
            </td>
            <td>
                <code>https</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Make server accessible over a secure connection (https) instead of http.
            </td>
        </tr>
        <tr>
            <td>
                SSL/TLS cerificate
            </td>
            <td>
                <code>httpsCert</code>
            </td>
            <td>
                string
            </td>
            <td>
                -
            </td>
            <td>
                Optionally override this option to provide a custom HTTPS certificate.
            </td>
        </tr>
        <tr>
            <td>
                SSL/TLS private key
            </td>
            <td>
                <code>httpsKey</code>
            </td>
            <td>
                string
            </td>
            <td>
                -
            </td>
            <td>
                Optionally override this option to provide a custom HTTPS private key.
            </td>
        </tr>
        <tr>
            <td>
                Enable HTTP Basic authentication
            </td>
            <td>
                <code>httpAuth</code>
            </td>
            <td>
                true/false
            </td>
            <td>
                false
            </td>
            <td>
                Require authentication using the basic HTTP protocol. Specify a username and password in the httpAuthUsername and httpAuthPassword options. If either option is missing or invalid, the web server will become inaccessible.
            </td>
        </tr>
        <tr>
            <td>
                HTTP Basic auth username
            </td>
            <td>
                <code>httpAuthUsername</code>
            </td>
            <td>
                string
            </td>
            <td>
                -
            </td>
            <td>
                Username for HTTP Basic authentication. Cannot contain ":".
            </td>
        </tr>
        <tr>
            <td>
                HTTP Basic auth password
            </td>
            <td>
                <code>httpAuthPassword</code>
            </td>
            <td>
                string
            </td>
            <td>
                -
            </td>
            <td>
                Password for HTTP Basic authentication. Stored in plain text.
            </td>
        </tr>
        <tr>
            <td>
                Maximum connections per IP address
            </td>
            <td>
                <code>ipThrottling</code>
            </td>
            <td>
                number
            </td>
            <td>
                10
            </td>
            <td>
                Limits the number of incoming connections per IP address. Set to 0 for unlimited connections.
            </td>
        </tr>
    </tbody>
</table>
