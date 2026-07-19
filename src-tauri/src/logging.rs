// Console logging that optionally mirrors to server.log, gated by config.log.
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};

static LOGGING: AtomicBool = AtomicBool::new(false);

pub fn set_logging(enabled: bool) {
    LOGGING.store(enabled, Ordering::Relaxed);
}

pub fn log(msg: &str) {
    let line = format!(
        "[{}] {}",
        chrono::Local::now().format("%Y-%m-%d %H:%M:%S"),
        msg
    );
    println!("{}", line);
    if LOGGING.load(Ordering::Relaxed) {
        crate::config::ensure_data_dir();
        if let Ok(mut f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(crate::config::log_path())
        {
            let _ = writeln!(f, "{}", line);
        }
    }
}
