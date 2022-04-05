# Coming from Web Server for Chrome?

Simple Web Server is a continuation of Web Server for Chrome, and was created because Chrome Apps are going away. It's designed to be familiar for users coming from Web Server for Chrome.

<figure>
  <img src='/images/web_server_for_chrome_options_vs_simple_web_server_options_figure.jpeg'>
  <figcaption>Server options in Web Server for Chrome (left) compared to Simple Web Server (right).</figcaption>
</figure>

Simple Web Server has many new features and capabilities for users coming from Web Server for Chrome.
- You can now run multiple local web servers at the same time
- Simple Web Server has many more server configuration options

However, some features from Web Server for Chrome have been removed in favor of alternate solutions. Here is a list of removed options:

<table>
    <tr>
        <td><b>Option</b></td>
        <td><b>Alternative solution</b></td>
    </tr>
    <tr>
        <td>Start on login</td>
        <td>Use the option in your operating system instead. See <a href="https://support.microsoft.com/en-us/windows/add-an-app-to-run-automatically-at-startup-in-windows-10-150da165-dcd9-7230-517b-cf3c295d89dd" target="_blank">Add an app to run automatically at startup in Windows 10</a> or <a href="https://support.apple.com/guide/mac-help/open-items-automatically-when-you-log-in-mh15189/mac" target="_blank">Open items automatically when you log in on Mac</a>.</td>
    </tr>
    <tr>
        <td>Accessible on internet</td>
        <td><b>TODO WRITE THIS</b> Not currently supported, but planned for a future release. <a href="https://github.com/terreng/simple-web-server/issues/56" target="_blank">See issue #56</a>.</td>
    </tr>
    <tr>
        <td>Prevent computer from sleeping</td>
        <td>Use the option in your operating system instead. See <a href="https://support.microsoft.com/en-us/windows/how-to-adjust-power-and-sleep-settings-in-windows-26f623b5-4fcc-4194-863d-b824e5ea7679" target="_blank">How to adjust power and sleep settings in Windows</a> or <a href="https://support.apple.com/guide/mac-help/set-sleep-and-wake-settings-mchle41a6ccd/mac" target="_blank">Set sleep and wake settings for your Mac</a>.</td>
    </tr>
    <tr>
        <td>Custom mod-rewrite Regexp</td>
        <td><b>Not supported.</b> Simple Web Server provides a simple checkbox option to enable a single page rewrite to a specified file, but does not provide an option to specify a custom regular expression. This option was omitted because we are not aware of any use cases for this feature. If you want to see this feature added in a future release, please <a href="https://github.com/terreng/simple-web-server/issues" target="_blank">open an issue</a> and share your use case.</td>
    </tr>
</table>