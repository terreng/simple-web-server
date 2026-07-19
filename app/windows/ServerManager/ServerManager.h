// ServerManager — React Native Windows module. Thin adapter over sws::AppCore
// (which owns the servers) plus native folder picker / open-external / quit.
//
// Register this in your app's ReactPackageProvider:
//   packageBuilder.AddModule(L"ServerManager",
//       winrt::Microsoft::ReactNative::MakeModuleProvider<
//           winrt::SimpleWebServer::ServerManager>());
#pragma once

#include "NativeModules.h"
#include "AppCore.h"

#include <winrt/Windows.Foundation.h>
#include <shobjidl.h>
#include <shellapi.h>

namespace winrt::SimpleWebServer {

REACT_MODULE(ServerManager);
struct ServerManager {
  using JSValue = winrt::Microsoft::ReactNative::JSValue;
  using JSValueObject = winrt::Microsoft::ReactNative::JSValueObject;
  using JSValueArray = winrt::Microsoft::ReactNative::JSValueArray;
  template <typename T>
  using ReactPromise = winrt::Microsoft::ReactNative::ReactPromise<T>;

  REACT_INIT(Initialize);
  void Initialize(winrt::Microsoft::ReactNative::ReactContext const& ctx) noexcept {
    m_context = ctx;
    auto& core = sws::AppCore::instance();
    core.onStatesChanged = [this] {
      ServerStates(sws::AppCore::instance().serverStates());
    };
    core.onIpChanged = [this](JSValueArray ip) { IpChange(std::move(ip)); };
    core.onConfigReload = [this](JSValueObject cfg) { ConfigReload(std::move(cfg)); };
  }

  REACT_METHOD(GetInitialState, L"getInitialState");
  void GetInitialState(ReactPromise<JSValue> result) noexcept {
    auto& core = sws::AppCore::instance();
    JSValueObject out;
    out["config"] = core.config();
    out["ip"] = core.ipList();
    out["installSource"] = IsPackaged() ? "microsoftstore" : "website";
    out["platform"] = "win32";
    out["version"] = AppVersion();
    result.Resolve(JSValue(std::move(out)));
  }

  REACT_METHOD(SaveConfig, L"saveConfig");
  void SaveConfig(JSValueObject config, bool /*reload*/) noexcept {
    sws::AppCore::instance().saveConfig(config);
    // Let the app update tray/window visibility if those settings changed.
    if (m_onAppearanceChanged) {
      m_onAppearanceChanged();
    }
  }

  REACT_METHOD(GetServerStates, L"getServerStates");
  void GetServerStates(ReactPromise<JSValue> result) noexcept {
    result.Resolve(JSValue(sws::AppCore::instance().serverStates()));
  }

  REACT_METHOD(GenerateCrypto, L"generateCrypto");
  void GenerateCrypto(ReactPromise<JSValue> result) noexcept {
    auto crypto = sws::AppCore::instance().generateCrypto();
    if (crypto.empty()) {
      result.Reject(L"Failed to generate certificate");
    } else {
      result.Resolve(JSValue(std::move(crypto)));
    }
  }

  REACT_METHOD(ShowFolderPicker, L"showFolderPicker");
  void ShowFolderPicker(std::wstring currentPath, ReactPromise<JSValue> result) noexcept {
    // COM folder dialog must run on a UI/STA thread.
    m_context.UIDispatcher().Post([currentPath, result] {
      std::wstring chosen = PickFolder(currentPath);
      if (chosen.empty()) {
        result.Resolve(JSValue::Null);
      } else {
        result.Resolve(JSValue(winrt::to_string(chosen)));
      }
    });
  }

  REACT_METHOD(OpenExternal, L"openExternal");
  void OpenExternal(std::wstring url) noexcept {
    ShellExecuteW(nullptr, L"open", url.c_str(), nullptr, nullptr, SW_SHOWNORMAL);
  }

  REACT_METHOD(Quit, L"quit");
  void Quit() noexcept {
    sws::AppCore::instance().shutdown();
    m_context.UIDispatcher().Post([] {
      if (auto app = winrt::Microsoft::UI::Xaml::Application::Current()) {
        app.Exit();
      }
    });
  }

  REACT_EVENT(ServerStates, L"serverStates");
  std::function<void(JSValueArray)> ServerStates;

  REACT_EVENT(IpChange, L"ipChange");
  std::function<void(JSValueArray)> IpChange;

  REACT_EVENT(ConfigReload, L"configReload");
  std::function<void(JSValueObject)> ConfigReload;

  REACT_EVENT(UpdateEvent, L"update");
  std::function<void(JSValueObject)> UpdateEvent;

 private:
  winrt::Microsoft::ReactNative::ReactContext m_context{nullptr};
  std::function<void()> m_onAppearanceChanged;

  static bool IsPackaged() {
    UINT32 len = 0;
    return GetCurrentPackageFullName(&len, nullptr) != APPMODEL_ERROR_NO_PACKAGE;
  }

  static std::string AppVersion() {
    // For packaged apps, read from the package; for unpackaged, from the exe
    // version resource. Simplified: return a build-time constant if unavailable.
    return "2.0.0";
  }

  static std::wstring PickFolder(const std::wstring& initial) {
    std::wstring result;
    winrt::com_ptr<IFileOpenDialog> dialog;
    if (FAILED(CoCreateInstance(CLSID_FileOpenDialog, nullptr, CLSCTX_INPROC_SERVER,
                                IID_PPV_ARGS(dialog.put())))) {
      return result;
    }
    DWORD options = 0;
    dialog->GetOptions(&options);
    dialog->SetOptions(options | FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM);
    if (!initial.empty()) {
      winrt::com_ptr<IShellItem> item;
      if (SUCCEEDED(SHCreateItemFromParsingName(initial.c_str(), nullptr,
                                                IID_PPV_ARGS(item.put())))) {
        dialog->SetFolder(item.get());
      }
    }
    if (SUCCEEDED(dialog->Show(nullptr))) {
      winrt::com_ptr<IShellItem> item;
      if (SUCCEEDED(dialog->GetResult(item.put()))) {
        PWSTR path = nullptr;
        if (SUCCEEDED(item->GetDisplayName(SIGDN_FILESYSPATH, &path))) {
          result = path;
          CoTaskMemFree(path);
        }
      }
    }
    return result;
  }
};

}  // namespace winrt::SimpleWebServer
