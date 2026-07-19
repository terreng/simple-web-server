use std::{
    net::TcpListener,
    thread,
    io::{Read, Write, SeekFrom, Seek},
    fs,
    fs::File,
    str,
    time::Duration,
    sync::{
        Arc,
        mpsc,
        Mutex,
        atomic::{AtomicBool, Ordering}
    }
};

static DIRECTORY_LISTING: &str = include_str!("directory-listing-template.html");

extern crate openssl;
pub mod file_system;
pub mod mime;
pub mod httpcodes;
pub mod wsparser;
mod socket_handler;
mod socket;

use substring::Substring;
use crate::{
    mime::get_mime_type,
    httpcodes::get_http_message,
    socket_handler::SocketHandler,
    socket::Socket,
    wsparser::WebSocketParser
};

use openssl::{
    rsa::Rsa,
    x509::{X509Builder, X509Name},
    pkey::PKey,
    asn1::{Asn1Time, Asn1Integer},
    bn::BigNum
};

const BASE_CHARS: [u8; 64] = [
    b'A', b'B', b'C', b'D', b'E', b'F', b'G', b'H', b'I', b'J', b'K', b'L', b'M', b'N', b'O', b'P',
    b'Q', b'R', b'S', b'T', b'U', b'V', b'W', b'X', b'Y', b'Z', b'a', b'b', b'c', b'd', b'e', b'f',
    b'g', b'h', b'i', b'j', b'k', b'l', b'm', b'n', b'o', b'p', b'q', b'r', b's', b't', b'u', b'v',
    b'w', b'x', b'y', b'z', b'0', b'1', b'2', b'3', b'4', b'5', b'6', b'7', b'8', b'9', b'+', b'/',
];

pub fn decode_base64(input: &[u8]) -> String {
	let mut output: Vec<u8> = Vec::new();
	for chunk in input.chunks(4) {

    	let a = decode_char(chunk[0]);
    	let b = decode_char(chunk[1]);
    	let c = decode_char(chunk[2]);
    	let d = decode_char(chunk[3]);

    	let dec1 = (a << 2) | (b & 0x30) >> 4;
    	let dec2 = ((b & 0x0F) << 4) | (c & 0x3C) >> 2;
    	let dec3 = ((c & 0x03) << 6) | (d);

    	output.push(dec1);
    	output.push(dec2);
    	output.push(dec3);
	}

	String::from_utf8(output).unwrap_or(String::new()).replace('\0', "")
}
fn decode_char(input: u8) -> u8 {
	BASE_CHARS.iter().position(|&c| c == input).unwrap_or(0) as u8
}


#[allow(dead_code)]
pub fn generate_dummy_cert_and_key() -> Result<(String, String), openssl::error::ErrorStack> {
    let rsa = Rsa::generate(2048)?;
    let private_key = PKey::from_rsa(rsa)?;

    let mut x509_builder = X509Builder::new()?;
    x509_builder.set_version(2)?;
    
    let mut subject = X509Name::builder()?;
    subject.append_entry_by_text("commonName", "cn")?;
    subject.append_entry_by_text("countryName", "US")?;
    subject.append_entry_by_text("ST", "test-st")?;
    subject.append_entry_by_text("localityName", "Simple Web Server")?;
    subject.append_entry_by_text("organizationName", "Simple Web Server")?;
    subject.append_entry_by_text("OU", "SWS")?;
    subject.append_entry_by_text("CN", "127.0.0.1")?;
    let subject_name = subject.build();
    x509_builder.set_subject_name(&subject_name)?;

    x509_builder.set_issuer_name(&subject_name)?;

    let serial_number_bn = BigNum::from_u32(1)?;

    let serial_number = Asn1Integer::from_bn(&serial_number_bn)?;
    x509_builder.set_serial_number(&serial_number)?;
    x509_builder.set_serial_number(&serial_number)?;

    let not_before = Asn1Time::days_from_now(0)?;
    let not_after = Asn1Time::days_from_now(365)?;
    x509_builder.set_not_before(&not_before)?;
    x509_builder.set_not_after(&not_after)?;

    x509_builder.set_pubkey(&private_key)?;

    x509_builder.sign(&private_key, openssl::hash::MessageDigest::sha256())?;
    
    let x509_cert = x509_builder.build();
    
    let cert = String::from_utf8_lossy(&x509_cert.to_pem()?).to_string();
    let key = String::from_utf8_lossy(&private_key.private_key_to_pem_pkcs8()?).to_string();

    Ok((cert, key))
}


#[derive(Copy, Clone)]
pub struct Settings<'a> {
    pub port: i32,
    pub path: &'a str,
    pub local_network: bool,
    pub spa: bool,
    pub rewrite_to: &'a str,
    pub directory_listing: bool,
    pub exclude_dot_html: bool,
    pub ipv6: bool,
    pub hidden_dot_files: bool,
    pub cors: bool,
    pub upload: bool,
    pub replace: bool,
    pub delete: bool,
    pub hidden_dot_files_directory_listing: bool,
    pub custom401: &'a str,
    pub custom403: &'a str,
    pub custom404: &'a str,
    pub custom500: &'a str,
    pub http_auth: bool,
    pub http_auth_username: &'a str,
    pub http_auth_password: &'a str,
    pub index: bool,
    pub https: bool,
    pub https_cert: &'a str,
    pub https_key: &'a str
}

#[allow(dead_code)]
pub fn url_decode(input: &str) -> String {
    let mut decoded = String::new();
    let mut bytes = input.bytes();
    let mut utf8_buffer = Vec::new();

    while let Some(byte) = bytes.next() {
        if byte == b'%' {
            if let (Some(hex1), Some(hex2)) = (bytes.next(), bytes.next()) {
                let hex_chars = [hex1, hex2];
                let hex_string: String = hex_chars.iter().map(|&x| x as char).collect();
                if let Ok(byte) = u8::from_str_radix(&hex_string, 16) {
                    utf8_buffer.push(byte);
                } else {
                    decoded.push('%');
                    decoded.push(hex1 as char);
                    decoded.push(hex2 as char);
                }
            } else {
                decoded.push('%');
            }
        } else {
            if !utf8_buffer.is_empty() {
                if let Ok(utf8_str) = str::from_utf8(&utf8_buffer) {
                    decoded.push_str(utf8_str);
                } else {
                    for b in &utf8_buffer {
                        decoded.push(*b as char);
                    }
                }
                utf8_buffer.clear();
            }
            decoded.push(byte as char);
        }
    }
    if !utf8_buffer.is_empty() {
        if let Ok(utf8_str) = str::from_utf8(&utf8_buffer) {
            decoded.push_str(utf8_str);
        } else {
            for b in &utf8_buffer {
                decoded.push(*b as char);
            }
        }
    }
    decoded
}

fn is_hidden(path: &String) -> bool {
    let components: Vec<&str> = path.split('/').collect();
    for component in components.iter() {
        if component.starts_with('.') && component != &"." && component != &".." {
            return true;
        }
    }
    false
}

#[allow(dead_code)]
pub fn relative_path(in_cur_path: &str, req_path: &str) -> String {
    let mut end_with_slash = false;
    if req_path.ends_with('/') {
        end_with_slash = true;
    }
    let is_windows = in_cur_path.contains(":");
    let drive_letter_prefix = if is_windows { format!("{}:", in_cur_path.split(":").collect::<Vec<_>>()[0]) } else { String::new() };
    let cur_path = in_cur_path.substring(drive_letter_prefix.len(), in_cur_path.len());
    
    let mut split1: Vec<&str> = cur_path.split('/').collect();
    let split2: Vec<&str> = req_path.split('/').collect();
    
    for w in split2.iter() {
        match *w {
            "" | "." => { /* . means current directory. Leave this here for spacing */ }
            ".." => {
                if !split1.is_empty() {
                    split1.pop();
                }
            }
            _ => {
                split1.push(w);
            }
        }
    }
    
    let mut new_path = split1.join("/");
    new_path = new_path.replace("//", "/");
    
    if !new_path.starts_with('/') {
        new_path = format!("/{}", new_path);
    }
    
    if end_with_slash && !new_path.ends_with('/') {
        new_path.push('/');
    }
    
    format!("{}{}", drive_letter_prefix, new_path)
}

#[allow(dead_code)]
fn strip_off_file(orig_path: &str) -> String {
    if orig_path == "/" {
        return "/".to_string();
    }
    
    let last_slash_idx = orig_path.rfind('/').unwrap_or(0);
    orig_path[0..last_slash_idx].to_string()
}

#[allow(dead_code)]
#[allow(unused_assignments)]
struct Header {
    name: String,
    value: String
}
#[allow(dead_code)]
#[allow(unused_assignments)]
impl Header {
    pub fn new(header:&str, value:&str) -> Header {
        Header {
            name: header.to_string(),
            value: value.to_string()
        }
    }
}


#[allow(dead_code)]
#[allow(unused_assignments)]
pub struct Request<'a> {
    pub path: String,
    pub origpath: String,
    pub method: String,
    stream: &'a mut Socket,
    headers: Vec<Header>,
    out_headers: Vec<Header>,
    status_code: i32,
    status_message: String,
    headers_written: bool,
    length: usize,
    consumed: usize,
    finished: bool,
    connection_closed: bool
}

#[allow(dead_code)]
#[allow(unused_assignments)]
impl Request<'_> {
    pub fn new(stream:&mut Socket, head:String) -> Request {
        let lines = head.split("\r\n").collect::<Vec<_>>();
        let parts = lines[0].split(' ').collect::<Vec<_>>();
        let mut headers = Vec::new();
        let mut length = 0;
        for (i, line) in lines.iter().enumerate() {
            if i == 0 { continue; };
            let header_split = line.split(": ").collect::<Vec<_>>();
            if header_split.len() < 2 { continue; };
            headers.push(Header::new(header_split[0], header_split[1]));
            if header_split[0].to_lowercase() == "content-length" {
                match header_split[1].parse::<usize>() {
                    Ok(num) => {
                        length = num;
                    },
                    Err(_e) => {/*nada*/},
                }
            }
        }
        let path = relative_path("", &url_decode(parts[1].splitn(2, '?').collect::<Vec<_>>()[0]));
        let origpath = relative_path("", parts[1].splitn(2, '?').collect::<Vec<_>>()[0]);
        //todo, parse url arguments
        Request {
            method: parts[0].to_string(),
            path,
            origpath,
            stream,
            headers,
            out_headers: Vec::new(),
            status_code: 200,
            status_message: String::from("OK"),
            headers_written: false,
            length,
            consumed: 0,
            finished: false,
            connection_closed: false
        }
    }
    pub fn read(&mut self, bytes:usize) -> Result<Vec<u8>, bool> {
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
                    if bytes_read == 0 {
                        self.connection_closed = true;
                        return Err(true);
                    }
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
    //Will truncate the file
    pub fn write_to_file(&mut self, path: &str) -> bool {
        let read_chunk_size = 1024 * 1024 * 4;
        let Ok(mut file) = File::create(path) else {
            return false;
        };
        let mut done = false;
        while !done {
            match self.read(read_chunk_size) {
                Ok(read) => {
                    done = read == b"";
                    match file.write(&read) {
                        Ok(_) => {},
                        Err(_e) => {
                            //uhh. what do we do here...
                            return false;
                        }
                    }
                }
                Err(fatal) => {
                    self.connection_closed = true;
                    self.stream.shutdown();
                    if fatal { return false; };
                }
            }
        }
        true
    }
    fn consume_body(&mut self) {
        let read_chunk_size = 1024 * 1024 * 4;
        while self.consumed != self.length {
            match self.read(read_chunk_size) {
                Ok(_) => {},
                Err(fatal) => {
                    self.connection_closed = true;
                    self.stream.shutdown();
                    if fatal { return; };
                }
            }
        }
    }
    pub fn read_string(&mut self, bytes:usize) -> String {
        let read = self.read(bytes).unwrap_or("".into());
        let msg = &String::from_utf8_lossy(&read[..read.len()]);
        msg.to_string()
    }
    pub fn read_all_string(&mut self) -> String {
        self.read_string(self.length - self.consumed)
    }
    fn send_headers(&mut self) {
        if self.headers_written {
            println!("Headers already sent!");
            return;
        }
        if !self.header_exists("Content-Length") {
            self.set_header("Transfer-Encoding", "Chunked");
        }
        //TODO - send date header
        let mut header = format!("HTTP/1.1 {} {}", self.status_code, self.status_message);
        for value in self.out_headers.iter() {
            header += &format!("\r\n{}:{}", value.name, value.value);
        }
        header += "\r\n\r\n";
        self.write_to_stream(header.as_bytes());
        self.headers_written = true;
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
    pub fn write(&mut self, data:&[u8]) {
        if !self.headers_written { self.send_headers(); };
        let chunked = self.header_value_equals("Transfer-Encoding", "Chunked");
        if chunked {
            self.write_to_stream((format!("{:x}", data.len())+"\r\n").as_bytes());
        }
        self.write_to_stream(data);
        if chunked {
            self.write_to_stream("\r\n".as_bytes());
        }
    }
    fn format_header(&self, header:&str) -> String {
        let binding = header.to_string();
        let mut parts: Vec<String> = binding.split('-').map(|s| s.to_string()).collect();
        for part in parts.iter_mut() {
            *part = part.to_lowercase();
            let Some(cc) = part.chars().next() else { continue; };
            let Some(capitalized_char) = cc.to_uppercase().next() else { continue; };
            let mut result = String::with_capacity(part.len());
            result.push(capitalized_char);
            result.push_str(&part[1..]);
            *part = result;
        }
        parts.join("-").to_string()
    }
    pub fn write_string(&mut self, data:&str) {
        self.write(data.to_string().as_bytes());
    }
    pub fn get_header(&mut self, header:&str) -> String {
        let head = self.format_header(header).to_string();
        for key in self.headers.iter() {
            if key.name == head {
                return key.value.as_str().to_string();
            }
        }
        String::new()
    }
    pub fn header_value_equals(&mut self, header:&str, value:&str) -> bool {
        let head = header.to_string();
        let val = value.to_string();
        for key in self.out_headers.iter() {
            if key.name == head {
                return key.value.to_lowercase() == val.to_lowercase();
            }
        }
        false
    }
    pub fn header_exists(&mut self, header:&str) -> bool {
        let head = header.to_string();
        for key in self.out_headers.iter() {
            if key.name == head {
                return true;
            }
        }
        false
    }
    pub fn set_header(&mut self, header:&str, value:&str) {
        // Are these header names and values valid?
        let new_header = Header::new(self.format_header(header).as_str(), value);
        for key in self.out_headers.iter_mut() {
            if key.name == new_header.name {
                *key = new_header;
                return;
            }
        }
        
        self.out_headers.push(new_header);
    }
    pub fn set_status(&mut self, code:i32) {
        self.status_code = code;
        self.status_message = get_http_message(code);
    }
    pub fn end(&mut self) {
        if self.finished { return; };
        self.consume_body();
        if !self.headers_written { self.send_headers(); };
        self.finished = true;
        let chunked = self.header_value_equals("Transfer-Encoding", "Chunked");
        if chunked {
            self.write_to_stream("0\r\n\r\n".as_bytes());
        } else {
            self.write_to_stream("\r\n\r\n".as_bytes());
        }
    }
    //The directory_listing and send_file functions will return either 404, 500, or 200
    pub fn directory_listing(&mut self, path:&str, no_body:bool, dot_files:bool) -> i32 {
        if self.headers_written {
            println!("Headers must not yet be sent when using send_file");
            return 500;
        }
        self.set_header("content-type", "text/html; charset=utf-8");
        let Ok(paths) = fs::read_dir(path) else {
            return 404;
        };
        let mut to_send = String::from("<!DOCTYPE html>\n<html dir=\"ltr\" lang=\"en\n<head><meta charset=\"utf-8\"><meta name=\"google\" value=\"notranslate\"><title id=\"title\"></title>\n</head>\n<body><div id=\"staticListing\"><style>li.directory {background:#aab}</style><a href=\"../\">parent</a><ul>");
        let mut js_listing = String::new();
        for path in paths {
            let Ok(file) = path else { continue; };
            let name = file.path().display().to_string();
            if !dot_files && is_hidden(&name) { continue; };
            let file_name = name.split('/').last().unwrap_or("");
            if file.path().is_dir() {
                to_send += &format!("<li class=\"directory\"><a href=\"{}/\">{}</a></li>", file_name, file_name);
            } else {
                to_send += &format!("<li><a href=\"{}/\">{}</a></li>", file_name, file_name);
            }
            
            let rawname = name.split('/').last().unwrap_or("").replace('"', "\\\"");
            let is_dir = if file.path().is_dir() { "true" } else { "false" };
            let modified = 0;
            let modifiedstr = "";
            let filesize = 0;
            let filesizestr = "";
            
            js_listing += &format!("<script>addRow(\"{}\", \"{}\", {}, \"{}\", \"{}\", \"{}\", \"{}\");</script>", rawname, rawname, is_dir, filesize, filesizestr, modified, modifiedstr);
        }
        to_send += &format!("</ul></div><div style=\"display: none;\" id=\"niceListing\">\n{}", DIRECTORY_LISTING);
        
        if self.origpath != "/" {
            to_send += "<script>onHasParentDirectory();</script>";
        }
        to_send += &format!("<script>start(\"{}\")</script>", self.path.replace('"', "\\\""));
        
        to_send += &js_listing;
        
        to_send += "</div></body></html>";
        
        let bytes = to_send.as_bytes();
        self.set_header("content-length", &bytes.len().to_string());
        if !no_body {
            self.write(bytes);
        }
        self.end();
        
        200
    }
    pub fn send_file(&mut self, path:&str, no_body:bool) -> i32 {
        if self.headers_written {
            println!("Headers must not yet be sent when using send_file");
            return 500;
        }
        //println!("Rendering file at {}", path);
        let read_chunk_size : u64 = 1024 * 1024 * 8;
        let Ok(mut file) = File::open(path) else {
            return 404;
        };
        let ext = path.split('.').last().unwrap_or("");
        let ct = get_mime_type(ext);
        if !ct.is_empty() {
            self.set_header("content-type", &ct);
        }
        let Ok(metadata) = file.metadata() else {
            return 500;
        };
        let size : u64 = metadata.len();
        let mut written : u64 = 0;
        
        let mut file_offset : u64 = 0;
        let mut file_end_offset : u64 = size - 1;
        let mut content_length : u64 = size;
        let mut code = 200;
        let range_header = self.get_header("Range");
        //println!("{}", self.get_header("Range"));
        if range_header != String::new() {
            //println!("Range Request");
            let range = range_header.split('=').collect::<Vec<_>>()[1].trim();
            let rparts = range.split('-').collect::<Vec<_>>();
            file_offset = rparts[0].parse::<u64>().unwrap_or(0);
            //println!("{} {}", range_header, rparts[1].len());
            if rparts[1].is_empty() {
                content_length = size - file_offset;
                
                if file_offset > file_end_offset {
                    file_offset = file_end_offset;
                }
                self.set_header("content-range", &format!("bytes {}-{}/{}", file_offset, size-1, size));
                code = if file_offset == 0 { 200 } else { 206 };
            } else {
                let new_end_offset = rparts[1].parse::<u64>().unwrap_or(0);
                if new_end_offset < file_end_offset {
                    file_end_offset = new_end_offset;
                }
                if file_offset > file_end_offset {
                    file_offset = file_end_offset;
                }
                content_length = file_end_offset - file_offset + 1;
                self.set_header("content-range", &format!("bytes {}-{}/{}", file_offset, file_end_offset, size));
                code = 206;
            }
        }
        
        self.set_header("content-length", &content_length.to_string());
        self.set_status(code);
        if no_body {
            drop(file);
            self.end();
            return 200;
        }
        let Ok(_) = file.seek(SeekFrom::Start(file_offset)) else { return 500; };
        while written < content_length {
            if self.connection_closed { break; };
            let chunk_size : u64 = if content_length-written > read_chunk_size { read_chunk_size } else { content_length-written };
            if chunk_size == 0 { break; };
            let mut buffer = vec![0; chunk_size as usize];
            let Ok(_) = file.read(&mut buffer) else { todo!() };
            self.write(&buffer);
            written += chunk_size;
        }
        drop(file);
        self.end();
        200
    }
}



fn read_header(stream:&mut Socket, on_websocket: fn(WebSocketParser, Settings), on_request: fn(Request, Settings), user_data: Settings, stopped_clone: &Arc<AtomicBool>) -> bool {
    let mut buffer = [0; 1];
    let mut request = String::new();
    
    loop {
        match stream.read(&mut buffer) {
            Ok(bytes_read) => {
                if bytes_read == 0 {
                    stream.shutdown();
                    return false;
                }
                match &String::from_utf8(buffer[..bytes_read].to_vec()) {
                    Ok(s) => {
                        request += s;
                    },
                    //an https request to an http server? Either way, we cant do anything with the data
                    Err(_) => {
                        stream.shutdown();
                        return false;
                    },
                }
                
                if request.ends_with("\r\n\r\n") {
                    break;
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                let value = stopped_clone.load(Ordering::Relaxed);
                if value { break; }
                thread::sleep(Duration::from_millis(10));
            }
            Err(_) => {
                break;
            },
        }
    }
    if request.is_empty() {
        stream.shutdown();
        return false;
    }
    let mut req = Request::new(stream, request.clone());
    if req.get_header("upgrade").to_lowercase() == "websocket" {
        let mut ws = WebSocketParser::new(req);
        ws.do_handshake(request);
        (on_websocket)(ws, user_data);
    } else {
        (on_request)(req, user_data);
    }
    true
}

#[allow(dead_code)]
pub struct Server {
    opts: Settings<'static>,
    sender: Option<mpsc::Sender<String>>,
    receiver: Arc<Mutex<mpsc::Receiver<String>>>,
    running: bool,
    on_request: fn(Request, Settings),
    on_websocket: fn(WebSocketParser, Settings)
}

#[allow(dead_code)]
impl Server {
    pub fn new(opts: Settings<'static>, on_request: fn(Request, Settings), on_websocket: fn(WebSocketParser, Settings)) -> Server {
        let (sender, receiver) = mpsc::channel();
        let receiver = Arc::new(Mutex::new(receiver));
        Server {
            opts,
            receiver,
            sender: Some(sender),
            running: false,
            on_request,
            on_websocket
        }
    }
    pub fn start(&mut self) -> bool {
        let receiver = self.receiver.clone();
        let opts = self.opts;
        let host = if opts.local_network {
            if opts.ipv6 { "::" } else { "0.0.0.0" }
        } else if opts.ipv6 { "::1" } else { "127.0.0.1" };
        let port = opts.port;
        let on_request = self.on_request;
        let on_websocket = self.on_websocket;
        match TcpListener::bind(format!("{}:{}", host, port)) {
            Ok(listener) => {
                match listener.set_nonblocking(true) {
                    Ok(_) => {},
                    Err(_) => { return false; },
                }
                thread::spawn(move || {
                    let stopped: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
                    
                    println!("Server started on http{}://{}:{}/", if opts.https { "s" } else { "" }, host, port);

                    let mut handler = SocketHandler::new(opts.https, opts.https_cert, opts.https_key);

                    for stream in listener.incoming() {
                        match stream {
                            Ok(stream) => {
                                let stopped_clone = Arc::clone(&stopped);
                                handler.execute(stream, move |mut socket| {
                                    while read_header(&mut socket, on_websocket, on_request, opts, &stopped_clone) {
                                        // keep alive
                                    }
                                    socket.drop();
                                    drop(stopped_clone);
                                });
                            }
                            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                                let Ok(handler) = receiver.lock() else {
                                    continue;
                                };
                                let message = handler.try_recv();
                                if let Ok(job) = message {
                                    if job == *"kill" {
                                        stopped.store(true, Ordering::Relaxed);
                                        break;
                                    }
                                }
                                thread::sleep(Duration::from_millis(10));
                            }
                            Err(e) => panic!("encountered IO error: {}", e),
                        }
                    }
                    drop(listener);
                });
            },
            Err(_) => {
                println!("Failed to listen on http://{}:{}/", host, port);
                return false;
            },
        }
        self.running = true;
        true
    }
    pub fn terminate(&mut self) {
        if !self.running { return; };
        println!("Killing server");
        self.running = false;
        let Some(sender) = self.sender.as_ref() else {
            self.terminate_failed(0);
            return;
        };
        let Ok(_) = sender.send(String::from("kill")) else {
            self.terminate_failed(0);
            return;
        };
        println!("Server has been killed");
    }
    pub fn terminate_failed(&mut self, count: i32) {
        println!("Failed to kill server. Retrying...");
        if !self.running { return; };
        println!("Killing server");
        self.running = false;
        let Some(sender) = self.sender.as_ref() else {
            self.terminate_failed(count + 1);
            return;
        };
        let Ok(_) = sender.send(String::from("kill")) else {
            self.terminate_failed(count + 1);
            return;
        };
        println!("Server has been killed");
    }
}
