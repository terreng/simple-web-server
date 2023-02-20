# 查看日志

Simple Web Server 可以将所有请求和任何错误记录到本地日志文件中，此功能默认关闭。

要启用日志记录，请将`log`设置设置为`true`。参见 [编辑 config.json](/docs/config%20file.md).

即使日志文件已禁用，您也可以在应用程序运行时查看日志，如下所述。

## 日志文件位置

在这里可以找到本地日志文件:

**Windows:** `C:\Users\[USERNAME]\AppData\Roaming\Simple Web Server\server.log`

**macOS (直接下载):** `/Users/[USERNAME]/Library/Application Support/Simple Web Server/server.log`

**macOS (App Store):** `/Users/[USERNAME]/Library/Containers/org.simplewebserver.simplewebserver/Data/Library/Application Support/Simple Web Server/server.log`

**Linux:** **TODO**

下面是日志文件的样子:

```
[5/11/2022, 4:54:04 PM] Listening on http://127.0.0.1:1234
[5/11/2022, 4:54:04 PM] Listening on http://127.0.0.1:8080
[5/11/2022, 4:54:08 PM] 127.0.0.1: Request GET /docs/logs.html
[5/11/2022, 4:54:09 PM] 127.0.0.1: Request GET /style.css
...
```

## 实时查看

在Electron应用程序中打开DevTools也可以实时查看日志。 按下 `CTRL + Shift + I` 打开DevTools (或者按下 `command + option + I` 在macOS上). 您可能需要增加窗口的宽度。

DevTools打开后，只需切换到"Console"选项卡即可查看日志。

<figure>
  <img src='/images/devtools_logs.jpeg' style='width: 600px'>
  <figcaption>使用DevTools实时查看日志</figcaption>
</figure>