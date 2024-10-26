# 来自Chrome的Web Server?

Simple Web Server是Web Server for Chrome的延续，它的诞生是因为Chrome应用程序正在消失。它的设计让来自Web Server for Chrome用户感到熟悉。

<figure>
  <img src='/images/web_server_for_chrome_options_vs_simple_web_server_options_figure.jpeg'>
  <figcaption>Web Server for Chrome 中的服务器选项(左) 相比 Simple Web Server (右).</figcaption>
</figure>

Simple Web Server为来自Web Server for Chrome的用户提供了许多新特性和功能。
- 您现在可以同时运行多个本地网络服务器
- Simple Web Server有更多的服务器配置选项

请注意，Web Server for Chrome的一些功能已被移除，取而代之的是其他解决方案。以下是已删除选项的列表：

<table>
    <tr>
        <td><b>选项</b></td>
        <td><b>替代解决方案</b></td>
    </tr>
    <tr>
        <td>开机自启动</td>
        <td>请改用操作系统中的实现。参见 <a href="https://support.microsoft.com/zh-CN/windows/add-an-app-to-run-automatically-at-startup-in-windows-10-150da165-dcd9-7230-517b-cf3c295d89dd" target="_blank">在 Windows 10 中添加在启动时自动运行的应用</a> 或者 <a href="https://support.apple.com/zh-cn/guide/mac-help/mh15189/mac" target="_blank">在 Mac 上登录时自动打开项目</a>.</td>
    </tr>
    <tr>
        <td>可通过互联网访问</td>
        <td><b>不建议使用。简单网络服务器不是为这种使用情况设计的。</b> 要在Internet上访问Web服务器，必须首先启用 <a href="/zh-CN/docs/options.html#accessible-on-local-network">可通过局域网访问</a> 选项, 然后<i>通过路由器转发</i>服务器的端口，以便互联网上的任何人都可以访问它。 在线搜索有关如何为特定路由器设置端口转发的指南， 或者 <a href="https://www.wikihow.com/Set-Up-Port-Forwarding-on-a-Router" target="_blank">查看此WikiHow指南</a>. 一旦设置了端口转发，并根据需要调整了防火墙设置，您将能够通过IP地址和指定的端口访问Web服务器。</td>
    </tr>
    <tr>
        <td>防止计算机休眠</td>
        <td>请改用操作系统中的选项。参见 <a href="https://support.microsoft.com/zh-CN/windows/how-to-adjust-power-and-sleep-settings-in-windows-26f623b5-4fcc-4194-863d-b824e5ea7679" target="_blank">如何在屏幕中调整电源和睡眠Windows</a> or <a href="https://support.apple.com/zh-cn/guide/mac-help/mchle41a6ccd/mac" target="_blank">设定 Mac 的睡眠和唤醒设置</a>.</td>
    </tr>
    <tr>
        <td>自定义 mod-rewrite Regexp</td>
        <td><b>不支持。</b> Simple Web Server提供了一个简单的复选框选项，用于启用对指定文件的单页重写，但不提供指定自定义正则表达式的选项。这个选项被省略了，因为我们不知道这个特性的任何用例。</td>
    </tr>
</table>
