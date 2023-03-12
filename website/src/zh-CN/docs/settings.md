# 应用设置

## 应用设置

选项名称对应于config.json中选项的键。请参见 [编辑 config.json](config%20file.md).

### 语言

- 名称: `language`
- 类型: string, `en` or `zh_CN`

支持的语言:
- `en`: English
- `zh_CN`: Simplified Chinese (简体中文)
- [帮助我们翻译](https://github.com/terreng/simple-web-server/issues/124)

如果`language`选项缺失或无效，应用程序将自动检测系统语言。

### 保持后台运行

- 名称: `background`
- 类型: `true/false`
- 默认值: `false`

启用后，即使窗口关闭，应用程序也将继续在后台运行Web服务器。要在启用此选项时停止程序，请单击"停止并退出"按钮。

### 在系统托盘/菜单栏中显示图标

- 名称: `tray`
- 类型: `true/false`
- 默认值: `false`

启用后，运行Simple Web Server时，会在系统托盘或菜单栏区域中显示图标。

### 检查更新

- 名称: `updates`
- 类型: `true/false`

定期检查是否有新版本可用。不会自动安装更新。

如果您从Mac AppStore下载应用程序，则此选项不可用。

### 外观

- 名称: `theme`
- 类型: string: `system`, `light`, or `dark`
- 默认值: `system`

更改外观(浅/深色主题)。默认跟随系统主题。可以设置为 `light`(浅色)或`dark`(深色)。

### 日志记录 <Badge type="tip" text="隐藏的" vertical="top" />

- 名称: `log`
- 类型: `true/false`
- 默认值: `false`

将此选项设置为`true`，以便将所有请求和任何错误记录到本地日志文件中。参见 [查看日志](/docs/logs.md). 该选项无法在应用程序看见。参见 [编辑 config.json](/docs/config%20file.md).