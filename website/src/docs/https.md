# Using HTTPS

Simple Web Server automatically generates a dummy certificate when you enable HTTPS, but you can also use your own custom HTTPS certificate if needed.

## Using a dummy certificate for testing purposes

Some newer web APIs require a secure (https) connection in order to use certain features. While this isn't a problem when testing on localhost (see [Secure contexts on MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)), you may want to use a dummy HTTPS certificate to test these features on other devices over LAN.

When you enable HTTPS by checking the HTTPS checkbox, Simple Web Server will automatically generate a self-signed dummy certificate for you. You don't need to do anything else unless you want to use a custom certificate (see below).

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

If you want to use your own certificate instead of the automatically generated dummy certificate, you can provide custom certificate files in the SSL/TLS certificate and SSL/TLS private key fields.

The file `fullchain.pem` corresponds to the SSL/TLS certificate.

The file `privkey.pem` corresponds to the SSL/TLS private key.

When you provide custom certificate values, they will override the automatically generated dummy certificate.