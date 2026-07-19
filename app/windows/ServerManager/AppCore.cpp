#include "pch.h"
#include "AppCore.h"

#include <winsock2.h>
#include <ws2tcpip.h>
#include <iphlpapi.h>
#pragma comment(lib, "iphlpapi.lib")
#pragma comment(lib, "ws2_32.lib")

extern "C" {
#include "sws_ffi.h"
}

#include "SWSUpdater.h"

using winrt::Microsoft::ReactNative::JSValue;
using winrt::Microsoft::ReactNative::JSValueArray;
using winrt::Microsoft::ReactNative::JSValueObject;

namespace sws {

static bool jbool(const JSValueObject& o, const char* key, bool def) {
  auto it = o.find(key);
  return it != o.end() ? it->second.AsBoolean() : def;
}
static std::string jstr(const JSValueObject& o, const char* key, const char* def) {
  auto it = o.find(key);
  return it != o.end() && !it->second.IsNull() ? it->second.AsString() : std::string(def);
}
static int32_t jint(const JSValueObject& o, const char* key, int32_t def) {
  auto it = o.find(key);
  return it != o.end() ? static_cast<int32_t>(it->second.AsInt64()) : def;
}

static ServerDesc descFromObject(const JSValueObject& d) {
  ServerDesc x;
  x.enabled = jbool(d, "enabled", false);
  x.path = jstr(d, "path", "");
  x.port = jint(d, "port", 8080);
  x.localnetwork = jbool(d, "localnetwork", false);
  x.showIndex = jbool(d, "showIndex", true);
  x.spa = jbool(d, "spa", false);
  x.rewriteTo = jstr(d, "rewriteTo", "/index.html");
  x.directoryListing = jbool(d, "directoryListing", true);
  x.excludeDotHtml = jbool(d, "excludeDotHtml", false);
  x.ipv6 = jbool(d, "ipv6", false);
  x.hiddenDotFiles = jbool(d, "hiddenDotFiles", false);
  x.cors = jbool(d, "cors", false);
  x.upload = jbool(d, "upload", false);
  x.replace = jbool(d, "replace", false);
  x.deleteFiles = jbool(d, "delete", false);
  x.hiddenDotFilesDirectoryListing = jbool(d, "hiddenDotFilesDirectoryListing", true);
  x.custom404 = jstr(d, "custom404", "");
  x.custom403 = jstr(d, "custom403", "");
  x.custom401 = jstr(d, "custom401", "");
  x.custom500 = jstr(d, "custom500", "");
  x.https = jbool(d, "https", false);
  x.httpsCert = jstr(d, "httpsCert", "");
  x.httpsKey = jstr(d, "httpsKey", "");
  x.httpAuth = jbool(d, "httpAuth", false);
  x.httpAuthUsername = jstr(d, "httpAuthUsername", "");
  x.httpAuthPassword = jstr(d, "httpAuthPassword", "");
  return x;
}

static JSValueObject objectFromDesc(const ServerDesc& d) {
  JSValueObject o;
  o["enabled"] = d.enabled;
  o["path"] = d.path;
  o["port"] = d.port;
  o["localnetwork"] = d.localnetwork;
  o["showIndex"] = d.showIndex;
  o["spa"] = d.spa;
  o["rewriteTo"] = d.rewriteTo;
  o["directoryListing"] = d.directoryListing;
  o["excludeDotHtml"] = d.excludeDotHtml;
  o["ipv6"] = d.ipv6;
  o["hiddenDotFiles"] = d.hiddenDotFiles;
  o["cors"] = d.cors;
  o["upload"] = d.upload;
  o["replace"] = d.replace;
  o["delete"] = d.deleteFiles;
  o["hiddenDotFilesDirectoryListing"] = d.hiddenDotFilesDirectoryListing;
  o["custom404"] = d.custom404;
  o["custom403"] = d.custom403;
  o["custom401"] = d.custom401;
  o["custom500"] = d.custom500;
  o["https"] = d.https;
  o["httpsCert"] = d.httpsCert;
  o["httpsKey"] = d.httpsKey;
  o["httpAuth"] = d.httpAuth;
  o["httpAuthUsername"] = d.httpAuthUsername;
  o["httpAuthPassword"] = d.httpAuthPassword;
  return o;
}

AppCore& AppCore::instance() {
  static AppCore inst;
  return inst;
}

AppCore::AppCore() {
  supervisor_.setStatesChanged([this] {
    if (onStatesChanged) {
      onStatesChanged();
    }
  });
  store_.setExternalChange([this](JSValueObject cfg) {
    reconcileFromConfig(cfg);
    if (onConfigReload) {
      onConfigReload(cfg.Copy());
    }
  });
}

void AppCore::start() {
  if (started_) {
    return;  // idempotent: safe to call from the app window and/or the RN module
  }
  started_ = true;
  reconcileFromConfig(store_.config());
  lastIp_ = ipList();
  store_.startWatching();
  Updater::instance().start();
  Updater::instance().setAutomaticChecksEnabled(jbool(store_.config(), "updates", false));
  // A lightweight IP poller mirroring the macOS 10s timer.
  std::thread([this] {
    for (;;) {
      std::this_thread::sleep_for(std::chrono::seconds(10));
      checkIpChange();
    }
  }).detach();
}

void AppCore::shutdown() {
  supervisor_.shutdownAll();
  Updater::instance().shutdown();
}

JSValueObject AppCore::config() { return store_.config(); }

void AppCore::reconcileFromConfig(const JSValueObject& config) {
  std::vector<ServerDesc> desired;
  auto it = config.find("servers");
  if (it != config.end() && it->second.Type() ==
                                 winrt::Microsoft::ReactNative::JSValueType::Array) {
    for (const auto& s : it->second.AsArray()) {
      if (s.Type() == winrt::Microsoft::ReactNative::JSValueType::Object) {
        desired.push_back(descFromObject(s.AsObject()));
      }
    }
  }
  supervisor_.reconcile(desired);
}

void AppCore::saveConfig(const JSValueObject& config) {
  store_.save(config);
  reconcileFromConfig(config);
  Updater::instance().setAutomaticChecksEnabled(jbool(config, "updates", false));
  if (onStatesChanged) {
    onStatesChanged();
  }
}

void AppCore::checkForUpdates() { Updater::instance().checkForUpdates(); }

bool AppCore::updaterAvailable() { return Updater::instance().available(); }

JSValueArray AppCore::serverStates() {
  JSValueArray out;
  for (const auto& s : supervisor_.states()) {
    JSValueObject entry;
    entry["config"] = objectFromDesc(s.desc);
    entry["state"] = std::string(to_string(s.state));
    if (!s.errorMessage.empty()) {
      entry["error_message"] = s.errorMessage;
    }
    out.push_back(std::move(entry));
  }
  return out;
}

JSValueObject AppCore::generateCrypto() {
  char* cert = nullptr;
  char* key = nullptr;
  JSValueObject out;
  if (sws_generate_cert_and_key(&cert, &key)) {
    out["cert"] = std::string(cert);
    out["privateKey"] = std::string(key);
    sws_string_free(cert);
    sws_string_free(key);
  }
  return out;
}

bool AppCore::background() { return jbool(store_.config(), "background", false); }
bool AppCore::tray() { return jbool(store_.config(), "tray", false); }

JSValueArray AppCore::ipList() {
  JSValueArray ips;
  ULONG size = 15000;
  std::vector<char> buffer(size);
  auto* addrs = reinterpret_cast<IP_ADAPTER_ADDRESSES*>(buffer.data());
  ULONG flags = GAA_FLAG_SKIP_ANYCAST | GAA_FLAG_SKIP_MULTICAST | GAA_FLAG_SKIP_DNS_SERVER;
  if (GetAdaptersAddresses(AF_UNSPEC, flags, nullptr, addrs, &size) == ERROR_BUFFER_OVERFLOW) {
    buffer.resize(size);
    addrs = reinterpret_cast<IP_ADAPTER_ADDRESSES*>(buffer.data());
    GetAdaptersAddresses(AF_UNSPEC, flags, nullptr, addrs, &size);
  }
  for (auto* a = addrs; a; a = a->Next) {
    if (a->OperStatus != IfOperStatusUp) {
      continue;
    }
    for (auto* u = a->FirstUnicastAddress; u; u = u->Next) {
      char host[NI_MAXHOST]{};
      if (getnameinfo(u->Address.lpSockaddr, u->Address.iSockaddrLength, host,
                      sizeof(host), nullptr, 0, NI_NUMERICHOST) != 0) {
        continue;
      }
      std::string addr(host);
      std::string bare = addr.substr(0, addr.find('%'));
      if (bare.rfind("fe80:", 0) == 0) {
        continue;
      }
      bool v6 = u->Address.lpSockaddr->sa_family == AF_INET6;
      bool isLan = bare != "127.0.0.1" && bare != "::1";
      JSValueArray entry;
      entry.push_back(bare);
      entry.push_back(v6 ? "ipv6" : "ipv4");
      entry.push_back(isLan);
      ips.push_back(std::move(entry));
    }
  }
  return ips;
}

void AppCore::checkIpChange() {
  JSValueArray ip = ipList();
  std::lock_guard<std::mutex> lock(mutex_);
  if (JSValue(ip.Copy()).Equals(JSValue(lastIp_.Copy()))) {
    return;
  }
  lastIp_ = ip.Copy();
  if (onIpChanged) {
    onIpChanged(std::move(ip));
  }
}

}  // namespace sws
