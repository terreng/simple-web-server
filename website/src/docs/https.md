# Using HTTPS

Simple Web Server supports custom HTTPS certificates, but it can also generate dummy certificates for you for testing purposes.

## Using a dummy certificate for testing purposes

Some newer web APIs require a secure (https) connection in order to use certain features. While this isn't a problem when testing on localhost (see [Secure contexts on MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)), you may want to use a dummy HTTPS certificate to test these features on other devices over LAN.

To use HTTPS with a dummy certificate, check the HTTPS checkbox and then click the "Generate dummy cert" button.

Because the certificate is self-signed, you will receive an error message in the browser.

<figure>
  <img src='/images/chrome https error.jpeg' style='width: 500px'>
  <figcaption>Unsecure connection warning message in Google Chrome.</figcaption>
</figure>


For testing purposes, you can bypass this error:

**Chrome:** Type `thisisunsafe` on your keyboard while on this screen.

**Firefox:** Click "Advanced..." and then click "Accept the Risk and Continue".

**Safari:** Click "Show details", click "visit this website" and then click "Visit website" to confirm.

## Using a custom certificate

The file `fullchain.pem` corresponds to the SSL/TLS certificate.

The file `privkey.pem` corresponds to the SSL/TLS private key.

To input a custom certificate, you should replace all newlines with `\r\n`.

If your cert/key is initially in the following format:

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

Then you should add `\r\n` to the end of each line:

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

And then remove all newlines:

```
-----BEGIN RSA PRIVATE KEY-----\r\nMIICXQIBAAKBgQDoRqTXkNqiQKbK+no0dOnZ7eI4I1irZsITmdcQcY9O8j0WT2Kz\r\nH5yCFzDxES6hBDr02qLHkGnjF+4Rz+g2OS0LZbOH24X0PDUewQAMoPchpYHaySCt\r\nD2FCJhisUE/mW9V4I/9o4q/GlvrhsPRwDTirOhbow3U/JnuEPAN0fmFzdQIDAQAB\r\nAoGAIe7aG6Ttj9kWlN4xVrMCy+PhEdb2F/o33aGypdQVPdENRBJeZrE2TdoB/CHI\r\nuFy0GTvMno92LKc9ECyZrbw+HF4bGUyZELtX1flE5tU2rhfNsL0xtKGspW8AdBfT\r\nKer6z/JMPXs5ncDboMsNhl+hpRpV7CpU5hsArEVMFuhWO3kCQQD7tll0JjWpGWdU\r\nVosMd0MYLaEuxyWbyattqEx83avHcwQ+wGLNLT6ZYCArySZj4hpwYjuzNTWL5S0K\r\nC535EKBtAkEA7DuJqBrFSCAWIQd9Jtu/Y5AQe30JIRVbRu5L1OIaOOt2Ua3A2kL+\r\npJbC3Zq/qRVpRpmfmcAmRSFwk9B10RGKKQJAaWARWtqUJFKKO3hvhax33itcCuU8\r\nDVgD+Eg4nR1/yGOSJ2MK+bIzPqpLTYlMFQyW3O2C6Kch34r1q/rpC1e2kQJBALm5\r\nsWdl7Lbg6yT6o02atOUNDbhYvIWzKbkhfqMXRHB9xt8+kQHIbDVwhjH+CTNhLwyf\r\nmRgjNrNhMAY2fXpqpMkCQQCEYOG41JqdZgmvTlrugg6FPHckRgSAkHIyBG62pnoV\r\nFkyXFbGQMpY1tMaj7xUndFaquF5KGc1csbmbeFKf5iq8\r\n-----END RSA PRIVATE KEY-----\r\n
```

You can also separate each line of a cert/key with a space (` `) instead of `\r\n`.