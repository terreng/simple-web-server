// AppCore — Windows counterpart of macOS's SWSAppCore. Process-wide owner of the
// running servers, config store and IP monitor, so servers keep running when the
// window is hidden (background mode). The ServerManager RN module and the app's
// tray/window code both talk to this singleton.
#pragma once

#include <winrt/Microsoft.ReactNative.h>

#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

#include "ConfigStore.h"
#include "SwsSupervisor.hpp"

namespace sws {

class AppCore {
 public:
  static AppCore& instance();

  using StatesChanged = std::function<void()>;
  using IpChanged =
      std::function<void(winrt::Microsoft::ReactNative::JSValueArray)>;
  using ConfigReload =
      std::function<void(winrt::Microsoft::ReactNative::JSValueObject)>;

  // Listener hooks set by the RN module (nil when no UI attached).
  StatesChanged onStatesChanged;
  IpChanged onIpChanged;
  ConfigReload onConfigReload;

  // Called once at app launch (starts enabled servers + IP polling).
  void start();
  void shutdown();

  winrt::Microsoft::ReactNative::JSValueObject config();
  void saveConfig(const winrt::Microsoft::ReactNative::JSValueObject& config);

  winrt::Microsoft::ReactNative::JSValueArray serverStates();
  winrt::Microsoft::ReactNative::JSValueArray ipList();

  // {"cert","privateKey"} or empty object on failure.
  winrt::Microsoft::ReactNative::JSValueObject generateCrypto();

  bool background();
  bool tray();

  void checkForUpdates();
  bool updaterAvailable();

 private:
  AppCore();
  void reconcileFromConfig(const winrt::Microsoft::ReactNative::JSValueObject& config);
  void checkIpChange();

  SwsSupervisor supervisor_;
  ConfigStore store_;
  winrt::Microsoft::ReactNative::JSValueArray lastIp_;
  std::mutex mutex_;
  bool started_ = false;
};

}  // namespace sws
