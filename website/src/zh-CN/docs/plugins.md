# 插件介绍

插件允许您进一步修改应用程序中可用选项，进一步修改Web服务器。

要安装插件，请点击 "添加插件" 然后选择目录或ZIP文件。

安装插件后，须为需要的服务专门启用它。

:::danger
插件没有隔离，并且以与应用程序相同的权限运行。您只有在了解并信任开发人员的情况下才安装插件"。
:::

## 社区插件

- [Web Proxy](https://github.com/ethanaobrien/web-proxy) by [@ethanaobrien](https://github.com/ethanaobrien) (Simple Web Server 的联合开发者)

想分享你的插件吗？[在GitHub上提交Issuse](https://github.com/terreng/simple-web-server/issues)请求我们将其添加到此列表中。

## 创建插件

### 步骤 1: 创建插件清单文件

首先，为你的插件创建一个新的文件夹。在文件夹中，创建一个名为 `plugin.json`的新文件。使用此文件可以指定插件的名称、唯一标识、任何可配置选项以及它运行的脚本文件的名称。

参见 [插件清单文件](/docs/plugin%20manifest%20file.md) 有关此文件的完整指南。

**plugin.json文件示例**

```json
{
  "name": "My Plugin",
  "id": "myplugin",
  "script": "script.js",
  "options": [
    {
      "id": "header",
      "name": "Add custom header",
      "description": "Enable this option to add a custom header to each response.",
      "type": "bool",
      "default": false
    }
  ]
}
```

### 步骤 2: 创建插件脚本

创建一个JavaScript文件，其名称与`plugin.json`文件中`script` 项的值相匹配，例如`script.js`。

该脚本可以有两个自定义函数:
- `onStart(server, options)`，它在服务器启动时调用，允许您修改服务器.
- `onRequest(req, res, options, preventDefault)`，它随每个请求一起调用，并允许您修改响应或根据需要处理请求。

参见 [插件脚本](/zh-CN/docs/plugin%20script.md) 有更多详细信息，包括对这些函数的参数的解释，以及常见用例的示例脚本。

**示例脚本文件**

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

### 步骤 3: 安装插件

要在应用程序中安装插件，请转到"设置">"添加插件"，然后选择插件文件所在的目录。您也可以从ZIP文件安装插件。

或者，您可以通过将插件复制到插件目录来手动安装插件。文件夹的名称必须与插件的id匹配。

**Windows:** `C:\Users\[USERNAME]\AppData\Roaming\Simple Web Server\plugins\`

**macOS (直接下载):** `/Users/[USERNAME]/Library/Application Support/Simple Web Server/plugins/`

**macOS (App Store):** `/Users/[USERNAME]/Library/Containers/org.simplewebserver.simplewebserver/Data/Library/Application Support/Simple Web Server/plugins/`

**Linux:** **TODO**

:::tip
对插件目录中已安装插件的更改将立即生效。在开发插件的过程中，我们建议直接修改此目录中的文件，这样您就不必在每次更改后重新安装插件。
:::

### 步骤 4: 调试任何问题

如果您看到 `plugin.json` 文件无效的错误，请检是否正确格式化。参见 [插件清单文件](/docs/plugin%20manifest%20file.md) 获取帮助。

如果您在服务器上遇到"Error starting plugins"错误，或者在响应Web请求时收到`Plugin error`错误消息，请查看日志以了解更多错误详细信息。参见 [查看日志](logs.md)。

如果您的插件不工作，并且您不确定原因，请考虑在代码中添加`console.log`语句以帮助调试。参见 [查看日志](logs.md)。