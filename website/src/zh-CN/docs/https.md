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

## 使用自定义证书

要输入自定义证书，应将所有换行替换为 `\r\n`.

如果您的cert/key最初是以下格式:

```
-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQDoRqTXkNqiQKbK+no0dOnZ7eI4I1irZsITmdcQcY9O8j0WT2Kz
H5yCFzDxES6hBDr02qLHkGnjF+4Rz+g2OS0LZbOH24X0PDUewQAMoPchpYHaySCt
D2FCJhisUE/mW9V4I/9o4q/GlvrhsPRwDTirOhbow3U/JnuEPAN0fmFzdQIDAQAB
AoGAIe7aG6Ttj9kWlN4xVrMCy+PhEdb2F/o33aGypdQVPdENRBJeZrE2TdoB/CHI
uFy0GTvMno92LKc9ECyZrbw+HF4bGUyZELtX1flE5tU2rhfNsL0xtKGspW8AdBfT
Ker6z/JMPXs5ncDboMsNhl+hpRpV7CpU5hsArEVMFuhWO3kCQQD7tll0JjWpGWdU
VosMd0MYLaEuxyWbyattqEx83avHcwQ+wGLNLT6ZYCArySZj4hpwYjuzNTWL5S0K
C535EKBtAkEA7DuJqBrFSCAWIQd9Jtu/Y5AQe30JIRVbRu5L1OIaOOt2Ua3A2kL+
pJbC3Zq/qRVpRpmfmcAmRSFwk9B10RGKKQJAaWARWtqUJFKKO3hvhax33itcCuU8
DVgD+Eg4nR1/yGOSJ2MK+bIzPqpLTYlMFQyW3O2C6Kch34r1q/rpC1e2kQJBALm5
sWdl7Lbg6yT6o02atOUNDbhYvIWzKbkhfqMXRHB9xt8+kQHIbDVwhjH+CTNhLwyf
mRgjNrNhMAY2fXpqpMkCQQCEYOG41JqdZgmvTlrugg6FPHckRgSAkHIyBG62pnoV
FkyXFbGQMpY1tMaj7xUndFaquF5KGc1csbmbeFKf5iq8
-----END RSA PRIVATE KEY-----
```

应该在每行末尾添加`\r\n`:

```
-----BEGIN RSA PRIVATE KEY-----\r\n
MIICXQIBAAKBgQDoRqTXkNqiQKbK+no0dOnZ7eI4I1irZsITmdcQcY9O8j0WT2Kz\r\n
H5yCFzDxES6hBDr02qLHkGnjF+4Rz+g2OS0LZbOH24X0PDUewQAMoPchpYHaySCt\r\n
D2FCJhisUE/mW9V4I/9o4q/GlvrhsPRwDTirOhbow3U/JnuEPAN0fmFzdQIDAQAB\r\n
AoGAIe7aG6Ttj9kWlN4xVrMCy+PhEdb2F/o33aGypdQVPdENRBJeZrE2TdoB/CHI\r\n
uFy0GTvMno92LKc9ECyZrbw+HF4bGUyZELtX1flE5tU2rhfNsL0xtKGspW8AdBfT\r\n
Ker6z/JMPXs5ncDboMsNhl+hpRpV7CpU5hsArEVMFuhWO3kCQQD7tll0JjWpGWdU\r\n
VosMd0MYLaEuxyWbyattqEx83avHcwQ+wGLNLT6ZYCArySZj4hpwYjuzNTWL5S0K\r\n
C535EKBtAkEA7DuJqBrFSCAWIQd9Jtu/Y5AQe30JIRVbRu5L1OIaOOt2Ua3A2kL+\r\n
pJbC3Zq/qRVpRpmfmcAmRSFwk9B10RGKKQJAaWARWtqUJFKKO3hvhax33itcCuU8\r\n
DVgD+Eg4nR1/yGOSJ2MK+bIzPqpLTYlMFQyW3O2C6Kch34r1q/rpC1e2kQJBALm5\r\n
sWdl7Lbg6yT6o02atOUNDbhYvIWzKbkhfqMXRHB9xt8+kQHIbDVwhjH+CTNhLwyf\r\n
mRgjNrNhMAY2fXpqpMkCQQCEYOG41JqdZgmvTlrugg6FPHckRgSAkHIyBG62pnoV\r\n
FkyXFbGQMpY1tMaj7xUndFaquF5KGc1csbmbeFKf5iq8\r\n
-----END RSA PRIVATE KEY-----\r\n
```

然后删除所有换行符使其成为一行字符串:

```
-----BEGIN RSA PRIVATE KEY-----\r\nMIICXQIBAAKBgQDoRqTXkNqiQKbK+no0dOnZ7eI4I1irZsITmdcQcY9O8j0WT2Kz\r\nH5yCFzDxES6hBDr02qLHkGnjF+4Rz+g2OS0LZbOH24X0PDUewQAMoPchpYHaySCt\r\nD2FCJhisUE/mW9V4I/9o4q/GlvrhsPRwDTirOhbow3U/JnuEPAN0fmFzdQIDAQAB\r\nAoGAIe7aG6Ttj9kWlN4xVrMCy+PhEdb2F/o33aGypdQVPdENRBJeZrE2TdoB/CHI\r\nuFy0GTvMno92LKc9ECyZrbw+HF4bGUyZELtX1flE5tU2rhfNsL0xtKGspW8AdBfT\r\nKer6z/JMPXs5ncDboMsNhl+hpRpV7CpU5hsArEVMFuhWO3kCQQD7tll0JjWpGWdU\r\nVosMd0MYLaEuxyWbyattqEx83avHcwQ+wGLNLT6ZYCArySZj4hpwYjuzNTWL5S0K\r\nC535EKBtAkEA7DuJqBrFSCAWIQd9Jtu/Y5AQe30JIRVbRu5L1OIaOOt2Ua3A2kL+\r\npJbC3Zq/qRVpRpmfmcAmRSFwk9B10RGKKQJAaWARWtqUJFKKO3hvhax33itcCuU8\r\nDVgD+Eg4nR1/yGOSJ2MK+bIzPqpLTYlMFQyW3O2C6Kch34r1q/rpC1e2kQJBALm5\r\nsWdl7Lbg6yT6o02atOUNDbhYvIWzKbkhfqMXRHB9xt8+kQHIbDVwhjH+CTNhLwyf\r\nmRgjNrNhMAY2fXpqpMkCQQCEYOG41JqdZgmvTlrugg6FPHckRgSAkHIyBG62pnoV\r\nFkyXFbGQMpY1tMaj7xUndFaquF5KGc1csbmbeFKf5iq8\r\n-----END RSA PRIVATE KEY-----\r\n
```

您也可以用空格（` `）而不是