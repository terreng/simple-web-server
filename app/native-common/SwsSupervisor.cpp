#include "SwsSupervisor.hpp"

#include <utility>

namespace sws {

bool ServerDesc::operator==(const ServerDesc& o) const {
  return enabled == o.enabled && path == o.path && port == o.port &&
         localnetwork == o.localnetwork && showIndex == o.showIndex &&
         spa == o.spa && rewriteTo == o.rewriteTo &&
         directoryListing == o.directoryListing &&
         excludeDotHtml == o.excludeDotHtml && ipv6 == o.ipv6 &&
         hiddenDotFiles == o.hiddenDotFiles && cors == o.cors &&
         upload == o.upload && replace == o.replace &&
         deleteFiles == o.deleteFiles &&
         hiddenDotFilesDirectoryListing == o.hiddenDotFilesDirectoryListing &&
         custom404 == o.custom404 && custom403 == o.custom403 &&
         custom401 == o.custom401 && custom500 == o.custom500 &&
         https == o.https && httpsCert == o.httpsCert &&
         httpsKey == o.httpsKey && httpAuth == o.httpAuth &&
         httpAuthUsername == o.httpAuthUsername &&
         httpAuthPassword == o.httpAuthPassword;
}

const char* to_string(RunState s) {
  switch (s) {
    case RunState::Stopped:
      return "stopped";
    case RunState::Starting:
      return "starting";
    case RunState::Running:
      return "running";
    case RunState::Error:
      return "error";
  }
  return "unknown";
}

SwsSupervisor::~SwsSupervisor() { shutdownAll(); }

void SwsSupervisor::stopLocked(Running& r) {
  if (r.handle) {
    sws_server_free(r.handle);
    r.handle = nullptr;
  }
  if (releasePath_ && !r.desc.path.empty()) {
    releasePath_(r.desc.path);
  }
}

void SwsSupervisor::reconcile(const std::vector<ServerDesc>& desired) {
  bool changed = false;
  {
    std::lock_guard<std::mutex> lock(mutex_);

    // 1) Stop servers that are no longer desired (removed, disabled, or edited).
    //    A running server is kept only if some desired, enabled entry equals it.
    for (auto it = running_.begin(); it != running_.end();) {
      bool wanted = false;
      for (const auto& d : desired) {
        if (d.enabled && d == it->desc) {
          wanted = true;
          break;
        }
      }
      if (!wanted) {
        stopLocked(*it);
        it = running_.erase(it);
        changed = true;
      } else {
        ++it;
      }
    }

    // 2) Start desired, enabled servers that are not already running.
    for (const auto& d : desired) {
      if (!d.enabled) {
        continue;
      }
      bool already = false;
      for (const auto& r : running_) {
        if (r.desc == d) {
          already = true;
          break;
        }
      }
      if (already) {
        continue;
      }

      Running r;
      r.desc = d;
      r.state = RunState::Starting;

      // Security-scoped bookmark (MAS) or other pre-start path check.
      if (acquirePath_ && !d.path.empty()) {
        std::string err = acquirePath_(d.path);
        if (!err.empty()) {
          r.state = RunState::Error;
          r.errorMessage = "FILESYSTEMERROR-" + err;
          running_.push_back(std::move(r));
          changed = true;
          continue;
        }
      }

      // Map ServerDesc -> C settings. All string pointers must stay valid across
      // the create() call; the FFI copies them, so locals are fine.
      SwsSettings s{};
      s.port = d.port;
      s.path = d.path.c_str();
      s.local_network = d.localnetwork;
      s.spa = d.spa;
      s.rewrite_to = d.rewriteTo.c_str();
      s.directory_listing = d.directoryListing;
      s.exclude_dot_html = d.excludeDotHtml;
      s.ipv6 = d.ipv6;
      s.hidden_dot_files = d.hiddenDotFiles;
      s.cors = d.cors;
      s.upload = d.upload;
      s.replace = d.replace;
      s.delete_files = d.deleteFiles;
      s.hidden_dot_files_directory_listing = d.hiddenDotFilesDirectoryListing;
      s.custom401 = d.custom401.c_str();
      s.custom403 = d.custom403.c_str();
      s.custom404 = d.custom404.c_str();
      s.custom500 = d.custom500.c_str();
      s.http_auth = d.httpAuth;
      s.http_auth_username = d.httpAuthUsername.c_str();
      s.http_auth_password = d.httpAuthPassword.c_str();
      s.index = d.showIndex;
      s.https = d.https;
      s.https_cert = d.httpsCert.c_str();
      s.https_key = d.httpsKey.c_str();

      r.handle = sws_server_create(&s);
      if (!r.handle) {
        r.state = RunState::Error;
        r.errorMessage = "Failed to create server";
        if (releasePath_ && !d.path.empty()) {
          releasePath_(d.path);
        }
      } else if (sws_server_start(r.handle)) {
        r.state = RunState::Running;
      } else {
        // The only synchronous failure from the Rust core is a bind failure,
        // i.e. the port is already in use (or not permitted). Surface it the way
        // the UI expects so it renders the "Port in use" panel.
        r.state = RunState::Error;
        r.errorMessage = "EADDRINUSE";
        sws_server_free(r.handle);
        r.handle = nullptr;
        if (releasePath_ && !d.path.empty()) {
          releasePath_(d.path);
        }
      }
      running_.push_back(std::move(r));
      changed = true;
    }
  }

  if (changed && onStatesChanged_) {
    onStatesChanged_();
  }
}

std::vector<ServerState> SwsSupervisor::states() const {
  std::lock_guard<std::mutex> lock(mutex_);
  std::vector<ServerState> out;
  out.reserve(running_.size());
  for (const auto& r : running_) {
    out.push_back(ServerState{r.desc, r.state, r.errorMessage});
  }
  return out;
}

void SwsSupervisor::shutdownAll() {
  std::lock_guard<std::mutex> lock(mutex_);
  for (auto& r : running_) {
    stopLocked(r);
  }
  running_.clear();
}

}  // namespace sws
