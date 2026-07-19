// supervisor_test.cpp — exercises the shared reconcile core against the real
// Rust library. Verifies start, HTTP-independent lifecycle, duplicate-port
// error surfacing, disable-stops-all, and the security-scoped-bookmark hook.
//
// Usage: supervisor_test <webroot-dir>
#include "SwsSupervisor.hpp"

#include <cstdio>
#include <cstring>
#include <string>

#ifdef _WIN32
#include <windows.h>
#define SLEEP_MS(ms) Sleep(ms)
#else
#include <unistd.h>
#define SLEEP_MS(ms) usleep((ms) * 1000)
#endif

using namespace sws;

static ServerDesc mk(const std::string& path, int port) {
  ServerDesc d;
  d.path = path;
  d.port = port;
  d.enabled = true;
  d.directoryListing = true;
  d.showIndex = true;
  return d;
}

static int failures = 0;
static void check(bool cond, const char* msg) {
  printf("%s: %s\n", cond ? "ok" : "FAIL", msg);
  if (!cond) {
    failures++;
  }
}

int main(int argc, char** argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: %s <webroot>\n", argv[0]);
    return 64;
  }
  const std::string root = argv[1];

  SwsSupervisor sup;
  int cbCount = 0;
  sup.setStatesChanged([&] { cbCount++; });

  // Start two servers.
  sup.reconcile({mk(root, 19001), mk(root, 19002)});
  SLEEP_MS(200);
  {
    auto states = sup.states();
    int running = 0;
    for (auto& s : states) {
      if (s.state == RunState::Running) {
        running++;
      }
    }
    check(states.size() == 2 && running == 2, "two servers running");
  }

  // Keep 19002; add a *different* server that conflicts on the same port. It
  // must differ from the running one (else reconcile treats it as already
  // running); a differing field makes reconcile attempt a bind, which fails.
  ServerDesc conflict = mk(root, 19002);
  conflict.cors = true;
  sup.reconcile({mk(root, 19002), conflict});
  SLEEP_MS(200);
  {
    bool sawError = false, sawRunning = false;
    for (auto& s : sup.states()) {
      if (s.state == RunState::Error && s.errorMessage == "EADDRINUSE") {
        sawError = true;
      }
      if (s.state == RunState::Running) {
        sawRunning = true;
      }
    }
    check(sawRunning, "kept server still running after reconcile");
    check(sawError, "duplicate port surfaces EADDRINUSE");
  }

  // Disable everything.
  ServerDesc off = mk(root, 19002);
  off.enabled = false;
  sup.reconcile({off});
  SLEEP_MS(150);
  check(sup.states().empty(), "disable stops and frees all servers");

  check(cbCount >= 3, "states-changed callback fired");

  // Path hook simulating a stale MAS bookmark.
  SwsSupervisor sup2;
  sup2.setPathHooks([](const std::string&) { return std::string("bookmarkDataIsStale"); },
                    nullptr);
  sup2.reconcile({mk(root, 19010)});
  {
    auto states = sup2.states();
    bool ok = states.size() == 1 && states[0].state == RunState::Error &&
              states[0].errorMessage == "FILESYSTEMERROR-bookmarkDataIsStale";
    check(ok, "path hook blocks start with FILESYSTEMERROR");
  }

  printf(failures == 0 ? "SUPERVISOR PASS\n" : "SUPERVISOR FAIL (%d)\n", failures);
  return failures == 0 ? 0 : 1;
}
