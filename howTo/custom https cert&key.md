# using custom https cert/key

This is the format that the cert/key is in

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

But you cannot use more than 1 line to define a variable in a json file

You must first convert the key/cert into a format that the server can read

Step 1 - add `\r\n` to the end of each line

It should look like this

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

Step 2 - remove the new lines

It should look like this

```
-----BEGIN RSA PRIVATE KEY-----\r\nMIICXQIBAAKBgQDoRqTXkNqiQKbK+no0dOnZ7eI4I1irZsITmdcQcY9O8j0WT2Kz\r\nH5yCFzDxES6hBDr02qLHkGnjF+4Rz+g2OS0LZbOH24X0PDUewQAMoPchpYHaySCt\r\nD2FCJhisUE/mW9V4I/9o4q/GlvrhsPRwDTirOhbow3U/JnuEPAN0fmFzdQIDAQAB\r\nAoGAIe7aG6Ttj9kWlN4xVrMCy+PhEdb2F/o33aGypdQVPdENRBJeZrE2TdoB/CHI\r\nuFy0GTvMno92LKc9ECyZrbw+HF4bGUyZELtX1flE5tU2rhfNsL0xtKGspW8AdBfT\r\nKer6z/JMPXs5ncDboMsNhl+hpRpV7CpU5hsArEVMFuhWO3kCQQD7tll0JjWpGWdU\r\nVosMd0MYLaEuxyWbyattqEx83avHcwQ+wGLNLT6ZYCArySZj4hpwYjuzNTWL5S0K\r\nC535EKBtAkEA7DuJqBrFSCAWIQd9Jtu/Y5AQe30JIRVbRu5L1OIaOOt2Ua3A2kL+\r\npJbC3Zq/qRVpRpmfmcAmRSFwk9B10RGKKQJAaWARWtqUJFKKO3hvhax33itcCuU8\r\nDVgD+Eg4nR1/yGOSJ2MK+bIzPqpLTYlMFQyW3O2C6Kch34r1q/rpC1e2kQJBALm5\r\nsWdl7Lbg6yT6o02atOUNDbhYvIWzKbkhfqMXRHB9xt8+kQHIbDVwhjH+CTNhLwyf\r\nmRgjNrNhMAY2fXpqpMkCQQCEYOG41JqdZgmvTlrugg6FPHckRgSAkHIyBG62pnoV\r\nFkyXFbGQMpY1tMaj7xUndFaquF5KGc1csbmbeFKf5iq8\r\n-----END RSA PRIVATE KEY-----\r\n
```

Step 3 - save the cert/key

Go to the savedata folder: 
Windows: `%USERPROFILE%\AppData\Roaming\Simple Web Server`
Linux: `~/.config/Simple Web Server/`
macOS: `$HOME/Library/Application Support/Simple Web Server/`

and open the file named `config.json` and replace the httpsCert or httpsKey value with your custom cert/key

