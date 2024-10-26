# 使用 HTTPS

Simple Web Server 支持自定义HTTPS证书，它还可以为您生成虚拟证书以进行测试。

## 使用虚拟证书进行测试

一些较新的Web API需要安全的(HTTPS)连接才能使用某些功能。虽然在本地测试时，这不是问题 (参见 [安全上下文](https://developer.mozilla.org/zh-CN/docs/Web/Security/Secure_Contexts)), 您可能需要使用虚拟HTTPS证书在LAN上的其他设备上测试这些功能。

要使用带虚拟证书的HTTPS，请检查HTTPS复选框，然后单击"生成虚拟证书"按钮。

由于证书是自签名的，您将在浏览器中收到错误消息。

<figure>
  <img src='/images/chrome https error.jpeg' style='width: 500px'>
  <figcaption>Google Chrome中的不安全连接警告消息。</figcaption>
</figure>


出于测试目的，您可以绕过这个错误:

**Chrome:**   在这个屏幕上直接键入`thisisunsafe`.

**Firefox:** 单击"高级…"，然后单击"接受风险并继续"。

**Safari:** 单击"显示详细信息"，单击"访问本网站"，然后单击"访问网站"进行确认。