use std::thread;

use openssl::{
    ssl::{SslMethod, SslAcceptor},
    rsa::Rsa,
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
    let key = Rsa::private_key_from_pem(key_str.as_bytes())?;
    
    let pkey = PKey::from_rsa(key)?;
    
    let mut builder = SslAcceptor::mozilla_intermediate(SslMethod::tls())?;
    builder.set_private_key(&pkey)?;
    builder.set_certificate(&cert)?;
    
    Ok(builder.build())
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
            thread::spawn(move || {
                f(Socket::new(Ok(stream)));
            });
            return;
        }
        let acceptor = self.acceptor.as_ref().unwrap().clone();
        thread::spawn(move || {
            match acceptor.accept(stream) {
                Ok(stream) => {
                    f(Socket::new(Err(stream)));
                }
                Err (ref _e) => {
                    //99% of the time this is an ssl handshake error. We should be able to safely ignore this.
                }
            }
        });
    }
}

