// ConfigStore — reads/writes/watches config.json under %APPDATA%\Simple Web Server,
// the Windows counterpart of SWSConfigStore on macOS.
#pragma once

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Data.Json.h>
#include <winrt/Microsoft.ReactNative.h>

#include <filesystem>
#include <fstream>
#include <functional>
#include <mutex>
#include <sstream>
#include <string>
#include <thread>

namespace sws {

// Returns %APPDATA%\Simple Web Server, creating it if needed.
inline std::filesystem::path appDataDir() {
  wchar_t* raw = nullptr;
  size_t len = 0;
  std::filesystem::path base;
  if (_wdupenv_s(&raw, &len, L"APPDATA") == 0 && raw) {
    base = raw;
    free(raw);
  }
  auto dir = base / L"Simple Web Server";
  std::error_code ec;
  std::filesystem::create_directories(dir, ec);
  return dir;
}

class ConfigStore {
 public:
  using ExternalChange = std::function<void(winrt::Microsoft::ReactNative::JSValueObject)>;

  ConfigStore() { load(); }

  std::filesystem::path path() const { return appDataDir() / L"config.json"; }

  winrt::Microsoft::ReactNative::JSValueObject config() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return config_.Copy();
  }

  void save(const winrt::Microsoft::ReactNative::JSValueObject& cfg) {
    std::lock_guard<std::mutex> lock(mutex_);
    config_ = cfg.Copy();
    std::wstring json = toJson(config_);
    lastWritten_ = json;
    std::ofstream out(path(), std::ios::binary | std::ios::trunc);
    std::string utf8 = winrt::to_string(json);
    out.write(utf8.data(), static_cast<std::streamsize>(utf8.size()));
  }

  void setExternalChange(ExternalChange cb) { onExternalChange_ = std::move(cb); }

  // Poll the file for external edits (simple + robust across editors/atomic
  // saves). Call once; runs a background thread.
  void startWatching() {
    watchThread_ = std::thread([this] {
      auto p = path();
      std::filesystem::file_time_type last{};
      for (;;) {
        std::this_thread::sleep_for(std::chrono::milliseconds(700));
        std::error_code ec;
        auto t = std::filesystem::last_write_time(p, ec);
        if (ec) {
          continue;
        }
        if (t != last) {
          last = t;
          handleExternalChange();
        }
      }
    });
    watchThread_.detach();
  }

 private:
  void load() {
    std::ifstream in(path(), std::ios::binary);
    if (!in) {
      return;
    }
    std::stringstream ss;
    ss << in.rdbuf();
    parse(winrt::to_hstring(ss.str()));
  }

  void parse(const winrt::hstring& text) {
    using namespace winrt::Windows::Data::Json;
    JsonObject obj{nullptr};
    if (JsonObject::TryParse(text, obj)) {
      config_ = jsonToJSValueObject(obj);
    }
  }

  void handleExternalChange() {
    std::ifstream in(path(), std::ios::binary);
    if (!in) {
      return;
    }
    std::stringstream ss;
    ss << in.rdbuf();
    std::wstring current = winrt::to_hstring(ss.str()).c_str();
    {
      std::lock_guard<std::mutex> lock(mutex_);
      if (current == lastWritten_) {
        return;  // our own write
      }
    }
    parse(winrt::to_hstring(ss.str()));
    if (onExternalChange_) {
      onExternalChange_(config());
    }
  }

  // JSValue <-> JSON helpers (declared in ConfigStore.cpp).
  static std::wstring toJson(const winrt::Microsoft::ReactNative::JSValueObject& obj);
  static winrt::Microsoft::ReactNative::JSValueObject jsonToJSValueObject(
      const winrt::Windows::Data::Json::JsonObject& obj);

  mutable std::mutex mutex_;
  winrt::Microsoft::ReactNative::JSValueObject config_;
  std::wstring lastWritten_;
  ExternalChange onExternalChange_;
  std::thread watchThread_;
};

}  // namespace sws
