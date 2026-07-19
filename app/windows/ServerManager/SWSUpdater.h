// SWSUpdater — Windows auto-update via WinSparkle (non-Store builds only).
//
// WinSparkle mirrors Sparkle: it reads a signed appcast feed, checks in the
// background, downloads the installer and runs it. It works with the existing
// NSIS/MSI installer, so distribution doesn't change. On the Microsoft Store /
// packaged (MSIX) build there is no self-updater (the Store handles updates), so
// this becomes a no-op when packaged and WinSparkle is not linked.
//
// Compiles with or without WinSparkle present (guarded by __has_include), so the
// project builds before you add the dependency — `available()` just returns
// false. Feed URL + public key are set here; see app/docs/UPDATER.md.
#pragma once

namespace sws {

class Updater {
 public:
  static Updater& instance();

  // Initialize WinSparkle (call once at launch, non-Store only).
  void start();
  void shutdown();

  bool available() const;
  void setAutomaticChecksEnabled(bool enabled);
  void checkForUpdates();  // shows the update UI

 private:
  Updater() = default;
  bool started_ = false;
};

}  // namespace sws
