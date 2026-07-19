mod simple_web_server;

use std::{thread, time::Duration, env};
use crate::simple_web_server::SimpleWebServer;
use server::{relative_path, Settings, generate_dummy_cert_and_key};
use clap::Parser;

fn string_to_static_str(s: String) -> &'static str {
    Box::leak(s.into_boxed_str())
}

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    #[arg(default_value = "./")]
    path: String,

    #[arg(short, long, default_value_t = 8080, help = "Port to listen on")]
    port: i32,
    
    #[arg(short, long, default_value_t = false, help = "Listen on local network")]
    network: bool,
    
    #[arg(short, long, default_value_t = false, help = "Automatically render index.html")]
    index: bool,
    
    #[arg(long, default_value_t = false, help = "Enable HTTPS")]
    https: bool,
    
    #[arg(long, default_value_t = false, help = "Allow PUT requests")]
    upload: bool,

    #[arg(long, default_value_t = false, help = "Allow DELETE requests")]
    delete: bool,

    #[arg(long, default_value_t = true, help = "Render directory listing")]
    dir_listing: bool
}


fn main() {
    let args = Args::parse();

    let mut cert = String::new();
    let mut key = String::new();
    
    if args.https {
        match generate_dummy_cert_and_key() {
            Ok((certt, keyy)) => {
                cert = certt;
                key = keyy;
            }
            Err(err) => {
                eprintln!("Error generating certificate and key: {:?}", err);
            }
        }
    }
    
    #[cfg(any(target_os = "linux", target_os = "macos"))]
    let default_path = "/";
    #[cfg(windows)]
    let default_path = "C:/";
    
    let current_path = env::current_dir().unwrap_or(default_path.into()).into_os_string().into_string().unwrap_or(String::from(default_path)).replace("\\", "/");
    let path = if args.path.starts_with("/") || args.path.contains(":") { args.path } else { relative_path(&current_path, &args.path) };

    let settings = Settings {
        path: string_to_static_str(path),
        index: args.index,
        local_network: args.network,
        port: args.port,
        spa: false,
        rewrite_to: "",
        directory_listing: args.dir_listing,
        exclude_dot_html: false,
        ipv6: false,
        hidden_dot_files: true,
        cors: false,
        upload: args.upload,
        replace: false,
        delete: args.delete,
        hidden_dot_files_directory_listing: true,
        custom500: "",
        custom404: "",
        custom403: "",
        custom401: "",
        http_auth: false,
        http_auth_username: "く",
        http_auth_password: "password",
        https: args.https,
        https_cert: string_to_static_str(cert),
        https_key: string_to_static_str(key)
    };
    let mut server = SimpleWebServer::new(settings);
    println!("Server started: {}", server.start());
    //let mut i = 0;
    loop {
    //    i += 1;
    //    if i > 20 {
    //        server.terminate();
    //    }
        thread::sleep(Duration::from_millis(100));
    }
    
    /*
    let mut cert = String::new();
    let mut key = String::new();
    
    match generate_dummy_cert_and_key() {
        Ok((certt, keyy)) => {
            cert = certt;
            key = keyy;
        }
        Err(err) => {
            eprintln!("Error generating certificate and key: {:?}", err);
        }
    }
    
    let settings = Settings {
        spa: false,
        rewrite_to: "",
        directory_listing: true,
        exclude_dot_html: false,
        ipv6: false,
        hidden_dot_files: true,
        cors: false,
        upload: false,
        replace: false,
        delete: false,
        hidden_dot_files_directory_listing: true,
        custom500: "",
        custom404: "",
        custom403: "",
        custom401: "",
        http_auth: false,
        http_auth_username: "く",
        http_auth_password: "password",
        https: true,
        https_cert: string_to_static_str(cert),
        https_key: string_to_static_str(key)
    };
    let mut server = SimpleWebServer::new(settings);
    println!("Server started: {}", server.start());
    //let mut i = 0;
    loop {
    //    i += 1;
    //    if i > 20 {
    //        server.terminate();
    //    }
        thread::sleep(Duration::from_millis(100));
    }*/
}

