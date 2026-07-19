use std::{
    thread,
    str,
    time::Duration
};
use sha1::{Sha1, Digest};
use regex::Regex;
use base64::{Engine as _, engine::{general_purpose}};
use crate::{Request, Socket};

// WebSocketParser is not currently thread safe
pub struct WebSocketParser<'a> {
    pub path: String,
    pub origpath: String,
    pub is_string: bool,
    pub is_continuation: bool,
   // request: Request<'a>,
    stream: &'a mut Socket,
    connection_closed: bool,
    
    mask: Vec<u8>,
    length: usize,
    consumed: usize,
    opcode: u8,
    handshake_done: bool
}

fn key_to_accept(data: &str) -> String {
    let Ok(regex) = Regex::new(r"Sec-WebSocket-Key: (.*)") else { return String::new(); };
    let Some(matches) = regex.captures(data) else { return String::new(); };
    let Some(cmatch) = matches.get(1) else { return String::new(); };
    let key = cmatch.as_str().trim();

    let mut hasher = Sha1::new();
    hasher.update(key.as_bytes());
    hasher.update("258EAFA5-E914-47DA-95CA-C5AB0DC85B11".as_bytes());
    let hash = hasher.finalize();

    general_purpose::STANDARD.encode(hash.as_slice())
}

#[allow(dead_code)]
#[allow(unused_assignments)]
impl WebSocketParser<'_> {
    pub fn new<'a>(req: Request<'a>) -> WebSocketParser<'a> {
        WebSocketParser {
            path: req.path.clone(),
            origpath: req.origpath.clone(),
            //request: req,
            stream: req.stream,
            connection_closed: false,
            handshake_done: false,
            consumed: 0,
            length: 0,
            mask: vec![0; 4],
            opcode: 1,
            is_string: false,
            is_continuation: false
        }
    }
    pub fn data_left(&self) -> usize {
        if self.connection_closed { return 0; };
        return self.length - self.consumed;
    }
    pub fn do_handshake(&mut self, header: String) {
        if self.handshake_done { return; }
        self.handshake_done = true;
        let key = key_to_accept(&header);
        if key == String::new() {
            self.connection_closed = true;
            self.stream.shutdown();
            return;
        }
        
        let response = format!(
            "HTTP/1.1 101 Switching Protocols\r\n\
            Connection: Upgrade\r\n\
            Upgrade: websocket\r\n\
            Sec-WebSocket-Accept: {}\r\n\r\n",
            key
        );

        self.write_to_stream(response.as_bytes());
        
    }
    pub fn connected(&self) -> bool {
        return !self.connection_closed;
    }
    fn read(&mut self, bytes: usize) -> Result<Vec<u8>, bool> {
        let mut bytes = bytes;
        if self.consumed + bytes > self.length || bytes == 0 {
            //Consume the whole/rest of the body
            bytes = self.length - self.consumed;
        }
        if bytes == 0 {
            return Ok(b"".to_vec());
        }
        let mut read = 0;
        let mut buffer = vec![];
        while read < bytes {
            let mut reading = vec![0; bytes-read];
            match self.stream.read(&mut reading) {
                Ok(bytes_read) => {
                    read += bytes_read;
                    //println!("{} bytes read", bytes_read);
                    reading.truncate(bytes_read);
                    buffer.append(&mut reading);
                }
                Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(10));
                }
                Err(_) => {
                    self.connection_closed = true;
                    return Err(true);
                }
            }
        }
        Ok(buffer)
    }
    fn write_to_stream(&mut self, data:&[u8]) -> bool {
        if self.connection_closed { return false; };
        let mut rv = true;
        loop {
            match self.stream.write(data) {
                Ok(_e) => {
                    rv = true;
                    break;
                },
                Err(e) => {
                    if e.kind() == std::io::ErrorKind::WouldBlock {
                        thread::sleep(Duration::from_millis(10));
                    } else {
                        rv = false;
                        self.connection_closed = true;
                        break;
                    }
                },
            };
        }
        rv
    }
    fn get_header(&self, len: usize, opcode: i32) -> Vec<u8> {
        let mut frame = vec![0u8; 10];
        
        frame[0] = (128 + opcode) as u8;
        let index_start_raw_data : usize;
        
        if len <= 125 {
            frame[1] = len as u8;
            index_start_raw_data = 2;
        } else if len <= 65535 {
            frame[1] = 126;
            frame[2] = ((len >> 8) & 0xFF) as u8;
            frame[3] = (len & 0xFF) as u8;
            index_start_raw_data = 4;
        } else {
            frame[1] = 127;
            frame[2] = ((len >> 56) & 0xFF) as u8;
            frame[3] = ((len >> 48) & 0xFF) as u8;
            frame[4] = ((len >> 40) & 0xFF) as u8;
            frame[5] = ((len >> 32) & 0xFF) as u8;
            frame[6] = ((len >> 24) & 0xFF) as u8;
            frame[7] = ((len >> 16) & 0xFF) as u8;
            frame[8] = ((len >> 8) & 0xFF) as u8;
            frame[9] = (len & 0xFF) as u8;
            index_start_raw_data = 10;
        }

        frame.truncate(index_start_raw_data);
        
        frame
    }
    pub fn write_data(&mut self, write_header: bool, size: usize, data:&[u8], opcode: i32) {
        if write_header {
            let header = self.get_header(size, opcode);
            self.write_to_stream(&header);
        }
        if data.len() > 0 {
            self.write_to_stream(data);
        }
    }
    pub fn data_available(&mut self) -> bool {
        if self.connection_closed { return false; }
        let mut buf = [0; 5];
        let len = self.stream.peek(&mut buf).unwrap_or(0);
        if len == 0 {
            self.connection_closed = true;
            return false;
        }
        if self.length - self.consumed > 0 { return true; }
        
        self.consumed = 0;
        self.length = 2;
        match self.read(2) {
            Ok(head) => {
                self.length = 0;
                self.consumed = 0;
                let opcode:u8;
                if head[0] >= 128 {
                    opcode = head[0]-128;
                } else {
                    opcode = head[0];
                }
                self.is_string = opcode == 1;
                self.is_continuation = opcode == 0;
                //println!("opcode: {}", opcode);
                
//              0 - More data
//              1 - Text
//              2 - Binary
//              8 - Connection Closed
//              9 - Ping
//              10 - Pong
                
                if !self.is_continuation {
                    self.opcode = opcode;
                }
                
                let mask = (head[1] & 0b10000000) != 0;
                let msglen = head[1] as usize & 0b01111111;
                
                //println!("msglen: {}", msglen);
                let mut length:usize = 0;
                
                match msglen {
                    126 => {
                        self.length = 2;
                        match self.read(2) {
                            Ok(size) => {
                                let size_value = u16::from_be_bytes([size[0], size[1]]);
                                length = size_value as usize;
                            },
                            Err(_) => {
                                return false;
                            }
                        }
                    },
                    127 => {
                        self.length = 8;
                        match self.read(8) {
                            Ok(size) => {
                                let mut size_array = [0; 8];
                                size_array.copy_from_slice(&size[..8]);
                                length = u64::from_be_bytes(size_array) as usize;
                            },
                            Err(_) => {
                                return false;
                            }
                        }
                    },
                    _ => {
                        length = msglen;
                    }
                }
                
                if opcode == 8 {
                    self.connection_closed = true;
                    return false;
                }
                //println!("{}, {}", msglen, length);
                
                if mask {
                    self.length = 4;
                    match self.read(4) {
                        Ok(masks) => {
                            self.length = length;
                            self.consumed = 0;
                            self.mask[0] = masks[0];
                            self.mask[1] = masks[1];
                            self.mask[2] = masks[2];
                            self.mask[3] = masks[3];
                            if opcode == 9 {
                                self.write_data(true, 0, &[0; 0], 10);
                            }
                            if msglen == 0 || opcode == 9 { return self.data_available(); }
                        },
                        Err(_) => {
                            self.stream.shutdown();
                            self.connection_closed = true;
                        }
                    }
                }
                
                return true;
            },
            Err(_) => {}
        }
        false
    }
    pub fn read_bytes(&mut self, bytes: usize) -> Vec<u8> {
        match self.read(bytes) {
            Ok(data) => {
                let len = data.len();
                //println!("{}", len);
                let mut decoded = vec![0; len];
                for i in 0..len {
                    let mask_index = self.consumed % 4;
                    decoded[i] = (data[i] ^ self.mask[mask_index]) as u8;
                    self.consumed += 1;
                }
                return decoded;
            },
            Err(_) => {}
        }
        return vec![0; 0];
    }
    pub fn read_all_bytes(&mut self) -> Vec<u8> {
        return self.read_bytes(self.length - self.consumed);
    }
    pub fn read_string(&mut self) -> String {
        return String::from_utf8_lossy(&self.read_bytes(self.length - self.consumed)).to_string();
    }
    pub fn write_string(&mut self, out: &str) {
        let data = out.as_bytes();
        self.write_data(true, data.len(), data, 1);
    }
    pub fn write_binary(&mut self, data: &[u8]) {
        self.write_data(true, data.len(), data, 2);
    }
}
