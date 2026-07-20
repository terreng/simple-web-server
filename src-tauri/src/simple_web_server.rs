use server::{
    Server,
    Settings,
    file_system::GetByPath,
    Request,
    httpcodes::get_http_message,
    mime::get_mime_type,
    decode_base64
};


pub struct SimpleWebServer {
    server: Server
}

#[allow(dead_code)]
impl SimpleWebServer {
    fn log(msg: String) {
        println!("{}", msg);
    }
    pub fn new(opts: Settings<'static>) -> SimpleWebServer {
        SimpleWebServer {
            server: Server::new(opts, SimpleWebServer::on_request)
        }
    }
    pub fn start(&mut self) -> bool {
        self.server.start()
    }
    pub fn terminate(&mut self) {
        self.server.terminate()
    }
    fn validate_auth(auth: String, username: &str, password: &str) -> bool {
        if auth.is_empty() { return false; };
        if !auth.to_lowercase().starts_with("basic ") { return false; };
        let base64_data = &auth[6..];
        let decoded_str = decode_base64(base64_data.as_bytes());
        if decoded_str.is_empty() || decoded_str == ":" { return false; };
        if let Some(index) = decoded_str.find(':') {
            let auth_username = &decoded_str[0..index];
            let auth_password = &decoded_str[index + 1..];
            
            return auth_username == username && auth_password == password;
        }
        false
    }
    // Serves a file, first honouring the precompression option: if enabled and a
    // `<path>.gz` / `<path>.br` exists and the client accepts it, serve that with
    // the matching Content-Encoding and the original file's Content-Type. gzip is
    // preferred over brotli (matches the old server).
    fn render_file(res: &mut Request, opts: Settings, path: &str, is_head: bool) -> i32 {
        // Skip precompression for range requests: a range of a .gz would be a
        // partial compressed stream the client couldn't decode. Serve the real
        // file so byte ranges are meaningful.
        if opts.precompression && res.get_header("Range").is_empty() {
            let ae = res.get_header("Accept-Encoding").to_lowercase();
            let ext = path.rsplit('.').next().unwrap_or("");
            let ct = get_mime_type(ext);
            for (suffix, encoding) in [(".gz", "gzip"), (".br", "br")] {
                if ae.contains(encoding) {
                    let candidate = format!("{}{}", path, suffix);
                    let entry = GetByPath::new(&candidate);
                    if !entry.error && entry.is_file {
                        res.set_header("content-encoding", encoding);
                        if !ct.is_empty() && !res.header_exists("Content-Type") {
                            res.set_header("content-type", &ct);
                        }
                        return res.send_file(&entry.path, is_head);
                    }
                }
            }
        }
        res.send_file(path, is_head)
    }
    fn on_request(mut res:Request, opts: Settings) {
        res.set_header("Connection", "keep-alive");
        res.set_header("Accept-ranges", "bytes");
        res.set_compress(opts.compression);

        if !opts.cache_control.is_empty() {
            res.set_header("cache-control", opts.cache_control);
        }

        if opts.cors {
            res.set_header("access-control-allow-origin", "*");
            res.set_header("access-control-allow-methods", "GET, POST, PUT, DELETE");
            res.set_header("access-control-max-age", "120");
        }
        
        if opts.http_auth && !Self::validate_auth(res.get_header("authorization"), opts.http_auth_username, opts.http_auth_password) {
            Self::error(res, opts, "", 401);
            return;
        }
        
        if res.method == "GET" || res.method == "HEAD" {
            // SPA rewriting happens as a 404 fallback (see error()), so real
            // files and directories are served first.
            Self::get(res, opts, "");
        } else if res.method == "PUT" {
            Self::put(res, opts);
        } else if res.method == "DELETE" {
            Self::delete(res, opts);
        } else if res.method == "OPTIONS" {
            res.end();
        } else {
            Self::error(res, opts, "", 501);
        }
    }
    fn error(mut res:Request, opts: Settings, msg: &str, code: i32) {
        // SPA fallback: serve the app entry point for not-found GET/HEAD requests.
        // This mirrors the old server, which only rewrites once the real path 404s
        // (so real files/directories still win). The res.path guard prevents an
        // infinite loop if the entry point itself is missing.
        if opts.spa && code == 404 && (res.method == "GET" || res.method == "HEAD") {
            let rewrite = if opts.rewrite_to.is_empty() { "/index.html" } else { opts.rewrite_to };
            if res.path != rewrite {
                // Set res.path for loop prevention (if the rewrite target itself
                // 404s we re-enter here and bail on the `res.path != rewrite`
                // check) and pass the target via rewrite_to so get() skips the
                // origpath-based redirects, which pertain to the original request
                // path, not the SPA entry point.
                res.path = rewrite.to_string();
                Self::get(res, opts, rewrite);
                return;
            }
        }
        if code == 401 {
            res.set_header("WWW-Authenticate", "Basic realm=\"SimpleWebServer\", charset=\"UTF-8\"");
        }
        res.set_status(code);
        if ((code == 401 && !opts.custom401.is_empty()) ||
           (code == 403 && !opts.custom403.is_empty()) ||
           (code == 404 && !opts.custom404.is_empty()) ||
           (code == 500 && !opts.custom500.is_empty())) &&
           msg != "NONOTUSECUSTOM" {
            let path = if code == 401 {opts.custom401} else if code == 403 {opts.custom403} else if code == 404 {opts.custom404} else if code == 500 {opts.custom500} else {""};
            let file_path = Self::from_relative(opts, path.to_string());
            let entry = GetByPath::new(&file_path);
            if !entry.error && entry.is_file {
                if Self::is_hidden_rel(opts, &entry.path) && !opts.hidden_dot_files {
                    Self::error(res, opts, if code == 404 { "NONOTUSECUSTOM" } else { "" }, 404);
                    return;
                }
                if res.send_file(&entry.path, res.method == "HEAD") == 200 {
                    return;
                }
            } else {
                Self::log(format!("Failed to read from custom {} path (\"{}\")", code, file_path));
            }
        }
        res.set_header("content-type", "text/html; charset=utf-8");
        
        let def_msg = format!("<h1>{} - {}</h1>\n\n<p>{}</p>", code, get_http_message(code), msg);
        let default_msg = def_msg.as_bytes();
        let size = default_msg.len();
        res.set_header("Content-length", &size.to_string());
        if res.method != "HEAD" {
            res.write(default_msg);
        }
        res.end();
    }
    fn from_relative(opts: Settings, path: String) -> String {
        let mut file_path = format!("{}{}", opts.path.to_owned(), path).replace('\\', "/");
        while file_path.contains("//") {
            file_path = file_path.replace("//", "/");
        }
        file_path
    }
    // Whether a resolved path is "hidden" (a dot-prefixed component) from the
    // client's perspective. The served root itself may legitimately live under
    // a dotted directory (e.g. ~/.config/site); checking the full filesystem
    // path there would flag every file as hidden. Strip the root prefix first
    // so only the portion the client actually requested is considered.
    fn is_hidden_rel(opts: Settings, full_path: &str) -> bool {
        let root = Self::from_relative(opts, String::new());
        let rel = full_path.strip_prefix(&root).unwrap_or(full_path);
        rel.split('/')
            .any(|c| c.starts_with('.') && c != "." && c != "..")
    }
    fn delete(mut res:Request, opts: Settings) {
        if !opts.delete {
            res.set_header("Content-length", "0");
            res.set_status(400);
            res.end();
            return;
        }
        let file_path = Self::from_relative(opts, res.path.clone());
        let entry = GetByPath::new(&file_path);
        if entry.error || entry.is_directory {
            Self::error(res, opts, "", 404);
            return;
        }
        match std::fs::remove_file(&file_path) {
            Ok(_) => {
                res.set_header("Content-length", "0");
                res.set_status(200);
                res.end();
            }
            Err(_) => {
                Self::error(res, opts, "", 500);
            }
        }
    }
    fn put(mut res:Request, opts: Settings) {
        if !opts.upload {
            Self::error(res, opts, "", 400);
            return;
        }
        let file_path = Self::from_relative(opts, res.path.clone());
        let entry = GetByPath::new(&file_path);
        if (!entry.error && !opts.replace) || entry.is_directory {
            //file exists
            Self::error(res, opts, "", 400);
            return;
        } else if !entry.error {
            match std::fs::remove_file(&file_path) {
                Ok(_) => {},
                Err(_) => {
                    Self::error(res, opts, "", 500);
                    return;
                }
            }
        }
        if !res.write_to_file(&file_path) {
            Self::error(res, opts, "", 500);
            return;
        }
        res.set_header("Content-length", "0");
        res.set_status(201);
        res.end();
    }
    fn get(mut res:Request, opts: Settings, rewrite_to: &str) {
        let path = if rewrite_to.is_empty() { res.path.clone() } else { rewrite_to.to_string() };
        let file_path = Self::from_relative(opts, path);
        let is_head = res.method == "HEAD";
        
        if rewrite_to.is_empty() && opts.exclude_dot_html && (res.origpath.ends_with(".html") || res.origpath.ends_with(".htm")) {
            let mut new_path = res.origpath.clone();
            let new_length = new_path.len() - if res.origpath.ends_with(".html") { 5 } else { 4 };
            new_path.truncate(new_length);
            res.set_header("location", &new_path);
            res.set_status(307);
            res.end();
            return;
        }
        
        if rewrite_to.is_empty() && opts.exclude_dot_html && res.origpath != "/" && !res.origpath.ends_with('/') {
            let entry = GetByPath::new(&(file_path.clone()+".html"));
            if !entry.error && entry.is_file {
                if Self::is_hidden_rel(opts, &entry.path) && !opts.hidden_dot_files {
                    Self::error(res, opts, "", 404);
                    return;
                }
                res.set_header("content-type", "text/html; charset=utf-8");
                if res.send_file(&entry.path, is_head) == 200 {
                    return;
                }
            }
            let entry2 = GetByPath::new(&(file_path.clone()+".htm"));
            if !entry2.error && entry2.is_file {
                if Self::is_hidden_rel(opts, &entry2.path) && !opts.hidden_dot_files {
                    Self::error(res, opts, "", 404);
                    return;
                }
                res.set_header("content-type", "text/html; charset=utf-8");
                if res.send_file(&entry2.path, is_head) == 200 {
                    return;
                }
            }
        }
        
        let entry = GetByPath::new(&file_path);
        if rewrite_to.is_empty() && entry.is_file && res.origpath != "/" && res.origpath.ends_with('/') {
            res.set_header("Content-length", "0");
            let mut path = res.origpath.clone();
            path.pop();
            res.set_header("location", &path);
            res.set_status(301);
            res.end();
            return;
        }
        if rewrite_to.is_empty() && entry.is_directory && !res.origpath.ends_with('/') {
            res.set_header("Content-length", "0");
            let path = res.origpath.clone();
            res.set_header("location", &(path+"/"));
            res.set_status(301);
            res.end();
            return;
        }
        if opts.index && entry.is_directory {
            if let Ok(paths) = std::fs::read_dir(file_path.clone()) {
                for path in paths {
                    if let Ok(path) = path {
                        let file = path.path().display().to_string();
                        let name = file.split('/').last().unwrap_or("");
                        if name == "index.html" || name == "index.htm" {
                            if Self::is_hidden_rel(opts, &entry.path) && !opts.hidden_dot_files {
                                Self::error(res, opts, "", 404);
                                return;
                            }
                            res.set_header("content-type", "text/html; charset=utf-8");
                            if Self::render_file(&mut res, opts, &(file_path.clone()+name), is_head) == 200 {
                                return;
                            }
                        } else if name == "index.xhtml" || name == "index.xhtm" {
                            if Self::is_hidden_rel(opts, &entry.path) && !opts.hidden_dot_files {
                                Self::error(res, opts, "", 404);
                                return;
                            }
                            res.set_header("content-type", "application/xhtml+xml; charset=utf-8");
                            if Self::render_file(&mut res, opts, &(file_path.clone()+name), is_head) == 200 {
                                return;
                            }
                        }
                    }
                }
            }
        }
        
        
        let mut rendered = false;
        if Self::is_hidden_rel(opts, &entry.path) && !opts.hidden_dot_files {
            Self::error(res, opts, "", 404);
            return;//rust will complain about a "moved value" so just return.
        } else if entry.is_file {
            rendered = Self::render_file(&mut res, opts, &entry.path, is_head) == 200;
        } else if opts.directory_listing && entry.is_directory {
            // Only reveal dotfiles in the listing when serving hidden files is
            // also enabled — otherwise they'd appear but 404 when clicked. The
            // "show in listing" option is a sub-option of "serve hidden files".
            let show_hidden = opts.hidden_dot_files && opts.hidden_dot_files_directory_listing;
            rendered = res.directory_listing(&entry.path, is_head, show_hidden) == 200;
        }
        if !rendered {
            Self::error(res, opts, "", 404);
        }
    }
}
