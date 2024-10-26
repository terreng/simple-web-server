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