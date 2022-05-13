# Viewing logs

Simple Web Server can log all requests and any errors to a local log file, but this is disabled by default.

To enable the log file, set the `log` setting to `true`. See [Editing config.json](/docs/config%20file.md).

You can always view logs while the app is running as described below, even if the log file is disabled.

## Log file location

Here's where to find the local log file:

**Windows:** `C:\Users\[USERNAME]\AppData\Roaming\Simple Web Server\server.log`

**macOS:** `/Users/[USERNAME]/Library/Application Support/Simple Web Server/server.log`

**Linux:** **TODO**

Here's what the log file might look like:

```
[5/11/2022, 4:54:04 PM] Listening on http://127.0.0.1:1234
[5/11/2022, 4:54:04 PM] Listening on http://127.0.0.1:8080
[5/11/2022, 4:54:08 PM] 127.0.0.1: Request GET /docs/logs.html
[5/11/2022, 4:54:09 PM] 127.0.0.1: Request GET /style.css
...
```

## View in real time

It's also possible to view the log in real time by opening DevTools in the Electron app. To open DevTools, press `CTRL + Shift + I` (or `command + option + I` on macOS). You may want to increase the width of the window.

Once DevTools opens, simply switch to the "Console" tab to see logs.

<figure>
  <img src='/images/devtools_logs.jpeg' style='width: 600px'>
  <figcaption>Viewing logs in real time using DevTools</figcaption>
</figure>