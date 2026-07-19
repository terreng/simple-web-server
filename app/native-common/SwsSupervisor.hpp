// SwsSupervisor — portable C++17 core shared by the macOS and Windows native
// modules. It owns the set of running servers and reconciles them against the
// desired configuration, exactly like the Electron main process's
// startServers()/createServer() did — but in-process, driving the Rust core
// through the C ABI (sws_ffi.h).
//
// Platform code (ObjC++ on macOS, C++/WinRT on Windows) converts its own config
// representation into a std::vector<ServerDesc>, calls reconcile(), and turns
// states() back into an RN payload. Two optional hooks let the macOS build wire
// in security-scoped bookmark access around each server's lifetime.
#pragma once

#include <functional>
#include <mutex>
#include <string>
#include <vector>

extern "C" {
#include "sws_ffi.h"
}

namespace sws {

// Mirrors the per-server config the UI stores (camelCase keys), already resolved
// to native types. `enabled` decides whether the server should be running.
struct ServerDesc {
  bool enabled = true;
  std::string path;
  int32_t port = 8080;
  bool localnetwork = false;
  bool showIndex = true;             // -> index
  bool spa = false;
  std::string rewriteTo = "/index.html";
  bool directoryListing = true;
  bool excludeDotHtml = false;
  bool ipv6 = false;
  bool hiddenDotFiles = false;
  bool cors = false;
  bool upload = false;
  bool replace = false;
  bool deleteFiles = false;          // -> delete
  bool hiddenDotFilesDirectoryListing = true;
  std::string custom404;
  std::string custom403;
  std::string custom401;
  std::string custom500;
  bool https = false;
  std::string httpsCert;
  std::string httpsKey;
  bool httpAuth = false;
  std::string httpAuthUsername;
  std::string httpAuthPassword;

  bool operator==(const ServerDesc& o) const;
  bool operator!=(const ServerDesc& o) const { return !(*this == o); }
};

enum class RunState { Stopped, Starting, Running, Error };

struct ServerState {
  ServerDesc desc;
  RunState state = RunState::Stopped;
  std::string errorMessage;  // e.g. "EADDRINUSE" or "FILESYSTEMERROR-..."
};

const char* to_string(RunState s);

class SwsSupervisor {
 public:
  // Called (on the caller's thread) whenever the set of states changes, so the
  // platform layer can push a fresh snapshot to the RN event emitter.
  using StatesChanged = std::function<void()>;

  // Optional. Called before a server starts. Return "" to allow, or an error
  // message to block (used on the Mac App Store to resolve + begin accessing a
  // security-scoped bookmark; a stale bookmark returns e.g.
  // "bookmarkDataIsStale"). The returned string is prefixed with
  // "FILESYSTEMERROR-" in the resulting state.
  using AcquirePath = std::function<std::string(const std::string& path)>;
  // Optional. Called after a server stops, to release the bookmark.
  using ReleasePath = std::function<void(const std::string& path)>;

  SwsSupervisor() = default;
  ~SwsSupervisor();

  SwsSupervisor(const SwsSupervisor&) = delete;
  SwsSupervisor& operator=(const SwsSupervisor&) = delete;

  void setStatesChanged(StatesChanged cb) { onStatesChanged_ = std::move(cb); }
  void setPathHooks(AcquirePath acquire, ReleasePath release) {
    acquirePath_ = std::move(acquire);
    releasePath_ = std::move(release);
  }

  // Start/stop servers so the running set matches `desired`. Thread-safe.
  void reconcile(const std::vector<ServerDesc>& desired);

  // Snapshot of the current states (one entry per running/attempted server).
  std::vector<ServerState> states() const;

  // Stop and free every server (call on app quit).
  void shutdownAll();

 private:
  struct Running {
    ServerDesc desc;
    SwsServerHandle* handle = nullptr;
    RunState state = RunState::Stopped;
    std::string errorMessage;
  };

  void stopLocked(Running& r);

  mutable std::mutex mutex_;
  std::vector<Running> running_;
  StatesChanged onStatesChanged_;
  AcquirePath acquirePath_;
  ReleasePath releasePath_;
};

}  // namespace sws
