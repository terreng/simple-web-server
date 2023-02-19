# 编辑 config.json

所有服务器选项和应用程序设置都存储在这个文件中, `config.json`. 可以手动编辑此文件以更改无法从用户界面访问的选项。

选项以JSON格式存储。您可以在[Server Options](options.md)和[App Settings](settings.md)页面上找到每个选项的名称（key）和值类型。

程序运行时对此文件所做的更改将立即生效。更改将重新加载应用程序的用户界面，这可能会导致您丢失用户界面未保存的更改。

:::warning
如果您从Mac AppStore下载使用该程序，您直接从config.json更改`path`选项，Web服务器可能会停止工作。这是因为该程序只有读取使用应用程序中的打开对话框选择的目录的权限。要避免此问题，请仅在应用程序内更改路径。
:::

以下是config.json文件的位置:

**Windows:** `C:\Users\[USERNAME]\AppData\Roaming\Simple Web Server\config.json`

**macOS (直接下载):** `/Users/[USERNAME]/Library/Application Support/Simple Web Server/config.json`

**macOS (App Store):** `/Users/[USERNAME]/Library/Containers/org.simplewebserver.simplewebserver/Data/Library/Application Support/Simple Web Server/config.json`

**Linux:** **TODO**

下面是配置文件的样子:

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