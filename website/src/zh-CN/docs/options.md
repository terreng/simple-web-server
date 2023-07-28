# 服务器配置

选项名称对应于config.json中选项的键。请参见 [编辑 config.json](config%20file.md).

## 基础配置

### 启用

- 名称: `enabled`
- 类型: `true/false`
- 默认值: -

### 文件夹路径

- 名称: `path`
- 类型: path string
- 默认值: -

提供文件的目录。要使用隐藏的文件夹，请确保启用 [提供隐藏/.文件的访问(高级规则)](#serve-hidden-dot-files).

### 端口

- 名称: `port`
- 类型: number 1 - 65535
- 默认值: `8080`

此端口可访问本机Web服务器。 访问网站：`http://localhost:[PORT]`。

### 可通过局域网访问

- 名称: `localnetwork`
- 类型: `true/false`
- 默认值: `false`

使局域网上的其他计算机可以通过LAN访问此Web服务器。使用主机的局域网IP地址和指定端口从另一台计算机访问它。LAN IP地址将显示在Web服务器URL下

启用此选项需要本地网络访问权限。 启用此选项时，您可能会看到防火墙权限提示，您必须允许访问，Web服务器才能通过LAN工作。

<figure>
  <img src='/images/windows_lan_warning.jpeg' style='width: 400px'>
  <figcaption>Windows 上的防火墙权限提示</figcaption>
</figure>

<figure>
  <img src='/images/macos_lan_warning.jpeg' style='width: 250px'>
  <figcaption>MacOS 上的防火墙权限提示</figcaption>
</figure>

## 基本规则

### 自动显示 index.html

- 名称: `showIndex`
- 类型: `true/false`
- 默认值: `true`

如果未指定文件路径，则自动提供<code>index.html</code>(如果存在)。

### 单页重写 (for SPAs)

- 名称: `spa`
- 类型: `true/false`
- 默认值: `false`

自动将不存在的所有路径重写为单个页面。参见 [单页应用](https://developer.mozilla.org/zh-CN/docs/Glossary/SPA).

### 重写到 (for SPAs)

- 名称: `rewriteTo`
- 类型: string
- 默认值: `/index.html`

如果启用了单页重写选项，请指定要重写到的文件。参见 [单页应用](https://developer.mozilla.org/zh-CN/docs/Glossary/SPA).

### 显示文件列表

- 名称: `directoryListing`
- 类型: `true/false`
- 默认值: `true`

显示指定目录中的文件列表，而不是404页面。

### 排除.html扩展名

- 名称: `excludeDotHtml`
- 类型: `true/false`
- 默认值: `false`

从URL中排除.htm和.html扩展名。例如，访问 `/example.html` 将重定向到 `/example`。如果路径上存在一个没有扩展名的文件，HTML文件仍然会被呈现。

## 高级规则

### 监听IPV6

- 名称: `ipv6`
- 类型: `true/false`
- 默认值: `false`

监听IPV6而不是默认的IPV4。这会将Web服务器URL更改为IPV6而不是IPV4，但是当启用LAN时，某些IPV4地址仍将正常工作。

### Cache-Control 通用消息头字段

- 名称: `cacheControl`
- 类型: string
- 默认值: -

(可选)指定自定义<code>Cache-Control</code>通用消息头字段。[了解更多有关 Cache-Control header.](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Headers/Cache-Control)

### 设置跨域请求头(CORS)

- 名称: `cors`
- 类型: `true/false`
- 默认值: `false`

允许跨域请求。设置`Access-Control-Allow-Origin` header to `*`, `Access-Control-Allow-Methods` to `GET, POST, PUT, DELETE`, and `Access-Control-Max-Age` to `120`. [了解更多有关 Cross-Origin Resource Sharing.](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)

### 提供隐藏/.文件的访问

- 名称: `hiddenDotFiles`
- 类型: `true/false`
- 默认值: `false`

允许请求隐藏/.文件。这些文件或文件夹的名称以.字符开头。注意：要在文件列表中显示它们请开启 "在目录列表中显示隐藏的/.文件"

### 允许上传文件

- 名称: `upload`
- 类型: `true/false`
- 默认值: `false`

允许PUT/POST请求。若包含隐藏/.文件，请确保开启"提供隐藏/.文件的访问"。

### 允许替换文件

- 名称: `replace`
- 类型: `true/false`
- 默认值: `false`

如果启用了文件上传，允许替换已存在的文件。 若包含隐藏/.文件，请确保开启"提供隐藏/.文件的访问"。

### 允许删除文件

- 名称: `delete`
- 类型: `true/false`
- 默认值: `false`

允许DELETE请求。若包含隐藏/.文件，请确保开启"提供隐藏/.文件的访问"。

### 始终使用静态文件列表

- 名称: `staticDirectoryListing`
- 类型: `true/false`
- 默认值: `false`

禁用文件列表页的JavaScript增强。

### 在目录列表中显示隐藏的/.文件

- 名称: `hiddenDotFilesDirectoryListing`
- 类型: `true/false`
- 默认值: `true`

如果启用了提供隐藏/.文件的访问，并勾选此选项，则它们会显示在目录列表中，其中包括`.swshtaccess` 文件。

### 启用.swshttaccess配置文件 <Badge type="tip" text="未完成/可能改变" vertical="top" />

- 名称: `htaccess`
- 类型: `true/false`
- 默认值: `false`

您可以使用<code>.swshtaccess</code>文件 设置每个目录的附加规则。 参见 [高级配置文件 .swshtaccess](swsaccess.md).

### 即时压缩 <Badge type="tip" text="隐藏的" vertical="top" />

- 名称: `compression`
- 类型: `true/false`
- 默认值: `false`

为支持的浏览器启用即时压缩。支持 `br`、`gzip` 和 `deflate` 压缩。由于性能较差，不推荐使用。[参见问题 #74](https://github.com/terreng/simple-web-server/issues/74)。

## 错误页面

### 自定义404页文件

- 名称: `custom404`
- 类型: path string
- 默认值: -

自定义404页面的文件路径。如果此值为空或指定的路径无效，将使用通用404页。

### 自定义403页文件

- 名称: `custom403`
- 类型: path string
- 默认值: -

自定义403页面的文件路径。如果此值为空或指定的路径无效，将使用通用403页。

### 自定义401页文件

- 名称: `custom401`
- 类型: path string
- 默认值: -

自定义401页面的文件。如果此值为空或指定的路径无效，将使用通用401页。

:::tip
您可以在config.json文件中为任何错误页面指定自定义文件路径。应用程序可能会检查以下错误页面：400, 401, 403, 404, 429, 500. 参见 [编辑 config.json](config%20file.md).
:::

### 自定义error path变量

- 名称: `customErrorReplaceString`
- 类型: path string
- 默认值: -

(可选)指定将在错误页面中查找并替换为当前路径的自定义字符串。 用例，您的自定义404页面内容中包含：`"位于{{PATH}}的文件不存在"`这样的字符串，并且您将此选项设置为`{{PATH}}`(默认)，则当您的自定义页面被提供时，它将显示`位于/example.txt的文件不不存在`。

## 安全

### 使用 HTTPS

- 名称: `https`
- 类型: `true/false`
- 默认值: `false`

使服务器只能通过安全连接(HTTPS)而不是HTTP访问。使用相同的单个端口，因此您不能同时同时使用HTTP和HTTPS。 参见 [使用 HTTPS](https.md).

### SSL/TLS 证书

- 名称: `httpsCert`
- 类型: string
- 默认值: -

可以选择重写此选项以使用自定义 HTTPS 证书。 参见 [使用 HTTPS](https.md).

### SSL/TLS 私钥

- 名称: `httpsKey`
- 类型: string
- 默认值: -

可以选择重写此选项以使用自定义 HTTPS 私钥。 参见 [使用 HTTPS](https.md).

### 启用HTTP基本身份验证

- 名称: `httpAuth`
- 类型: `true/false`
- 默认值: `false`

需要使用HTTP基本身份验证协议进行身份验证。在HTTP基本身份验证用户名和密码选项中指定用户名和密码。如果用户名或密码选项缺失或无效，则Web服务器将无法访问。

<figure>
  <img src='/images/http_basic_auth.jpeg' style='width: 400px'>
  <figcaption>浏览器中的 HTTP 身份验证提示。</figcaption>
</figure>

### HTTP基本身份验证用户名

- 名称: `httpAuthUsername`
- 类型: string
- 默认值: -

HTTP基本身份验证的用户名。不能包含冒号(`:`)字符。

### HTTP基本身份验证密码

- 名称: `httpAuthPassword`
- 类型: string
- 默认值: -

HTTP基本身份验证的密码。以纯文本形式存储。

### 每个IP地址的最大连接数

- 名称: `ipThrottling`
- 类型: number
- 默认值: `10`

限制每个IP地址的传入连接数。0表示无限制。