// Enumerates local IP addresses, mirroring getIPs() from the Electron build.
// Each entry is [address, family ("ipv4"|"ipv6"), is_lan].
use serde_json::{json, Value};

pub fn get_ips() -> Value {
    let mut ips: Vec<Value> = Vec::new();
    let non_lan = ["127.0.0.1", "::1"];

    if let Ok(ifaces) = if_addrs::get_if_addrs() {
        for iface in ifaces {
            let ip = iface.ip();
            let addr = ip.to_string();
            // Skip link-local IPv6 addresses (fe80::/10), same as the Electron build.
            if addr.starts_with("fe80:") || addr.starts_with("fe80%") {
                continue;
            }
            let family = if ip.is_ipv6() { "ipv6" } else { "ipv4" };
            let is_lan = !non_lan.contains(&addr.as_str());
            ips.push(json!([addr, family, is_lan]));
        }
    }

    // On macOS and Windows, also advertise the machine hostname (e.g. mDNS name).
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        if let Ok(name) = hostname::get() {
            let name = name.to_string_lossy().to_string();
            if !name.is_empty() && !non_lan.contains(&name.as_str()) {
                ips.push(json!([name, "ipv4", true]));
            }
        }
    }

    Value::Array(ips)
}
