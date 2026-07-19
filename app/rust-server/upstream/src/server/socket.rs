use openssl::ssl::SslStream;
use std::{
    net::TcpStream,
    io,
    io::{
        Read,
        Write,
        Error,
        ErrorKind
    }
};

pub struct Socket {
    stream: Result<TcpStream, SslStream<TcpStream>>
}

impl Socket {
    pub fn new(stream: Result<TcpStream, SslStream<TcpStream>>) -> Socket {
        Socket {
            stream
        }
    }
    pub fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        match self.stream {
            Ok(ref mut stream) => {
                stream.read(buf)
            }
            Err(ref mut stream) => {
                stream.read(buf)
            }
        }
    }
    pub fn write(&mut self, buf: &[u8]) -> io::Result<()> {
        match self.stream {
            Ok(ref mut stream) => {
                stream.write_all(buf)
            }
            Err(ref mut stream) => {
                stream.write_all(buf)
            }
        }
    }
    pub fn peek(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        match self.stream {
            Ok(ref mut stream) => {
                stream.peek(buf)
            }
            Err(ref mut stream) => {
                match stream.ssl_peek(buf) {
                    Ok(e) => {Ok(e)},
                    Err(_) => {Err(Error::new(ErrorKind::Other, "oh no!"))}
                }
            }
        }
    }
    pub fn shutdown(&mut self) {
        match self.stream {
            Ok(ref mut stream) => {
                let _ = stream.shutdown(std::net::Shutdown::Both);
            }
            Err(ref mut stream) => {
                let _ = stream.shutdown();
            }
        }
    }
    pub fn drop(mut self) {
        self.shutdown();
        drop(self.stream);
    }
}
