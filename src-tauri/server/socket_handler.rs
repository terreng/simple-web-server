use std::thread;

use openssl::{
    ssl::{SslMethod, SslAcceptor},
    x509::X509,
    pkey::PKey
};

use std::net::TcpStream;
use crate::Socket;

fn to_acceptor(cert_str: &str, key_str: &str) -> Result<SslAcceptor, openssl::error::ErrorStack> {
    let cert_str = cert_str
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<&str>>()
        .join("\n");

    let key_str = key_str
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<&str>>()
        .join("\n");

    let cert = X509::from_pem(cert_str.as_bytes())?;
    // Accept both PKCS#1 ("BEGIN RSA PRIVATE KEY") and PKCS#8
    // ("BEGIN PRIVATE KEY") keys. The bundled certificate generator emits
    // PKCS#8, while users may paste either format.
    let pkey = PKey::private_key_from_pem(key_str.as_bytes())?;

    let mut builder = SslAcceptor::mozilla_intermediate(SslMethod::tls())?;
    builder.set_private_key(&pkey)?;
    builder.set_certificate(&cert)?;
    
    Ok(builder.build())
}

// Returns true when the given certificate and key parse and can be used to
// build a TLS acceptor. Used to surface configuration errors in the UI before
// a server is marked "running".
pub fn validate_cert_and_key(cert_str: &str, key_str: &str) -> bool {
    to_acceptor(cert_str, key_str).is_ok()
}

pub struct SocketHandler {
    https: bool,
    acceptor: Option<SslAcceptor>,
    running: bool
}

impl SocketHandler {
    pub fn new(https: bool, https_cert: &str, https_key: &str) -> SocketHandler {
        let mut running = true;
        let acceptor = if https {
            if let Ok(acc) = to_acceptor(https_cert, https_key) {
                Some(acc)
            } else {
                println!("Failed to create ssl acceptor!");
                running = false;
                None
            }
        } else {
            None
        };
        SocketHandler {
            acceptor,
            https,
            running
        }
    }
    pub fn execute<F>(&mut self, stream: TcpStream, f: F)
    where
        F: FnOnce(Socket) + Send + 'static,
    {
        if !self.running { return; };
        if !self.https {
            // Non-blocking so the request loop's WouldBlock handling can poll the
            // "stopped" flag and shut the connection down when the server stops
            // (accepted sockets are blocking on Linux, non-blocking on macOS).
            let _ = stream.set_nonblocking(true);
            thread::spawn(move || {
                f(Socket::new(Ok(stream)));
            });
            return;
        }
        let acceptor = self.acceptor.as_ref().unwrap().clone();
        thread::spawn(move || {
            // openssl's handshake needs a blocking socket: on a non-blocking one
            // it returns WANT_READ (WouldBlock), which we'd treat as a failed
            // handshake and silently drop (browser: ERR_CONNECTION_CLOSED). Do the
            // handshake blocking, then switch to non-blocking so the request loop
            // can observe "stopped" and tear the connection down on shutdown —
            // otherwise a keep-alive connection keeps serving after the server is
            // turned off.
            let _ = stream.set_nonblocking(false);
            match acceptor.accept(stream) {
                Ok(stream) => {
                    let _ = stream.get_ref().set_nonblocking(true);
                    f(Socket::new(Err(stream)));
                }
                Err (ref _e) => {
                    //99% of the time this is an ssl handshake error. We should be able to safely ignore this.
                }
            }
        });
    }
}

