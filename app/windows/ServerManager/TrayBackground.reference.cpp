// TrayBackground.reference.cpp
//
// REFERENCE ONLY — not compiled as-is. Wire these pieces into the app shell that
// `npx react-native-windows-init` generates (App.cpp / the main window), to get
// the same background + tray behavior as the Electron app:
//
//   * Servers start at launch, independent of the window/JS bridge.
//   * "Keep running when closed" (config.background): closing the window hides it
//     (and removes the taskbar button) instead of quitting; the process — and
//     sws::AppCore's servers — keep running.
//   * Optional system-tray icon (config.tray) that restores the window.
//
// Mirrors Electron's window 'close' handler (hide instead of close) and the
// tray created in createTray().

#include "pch.h"
#include "AppCore.h"

#include <shellapi.h>
#include <windows.h>

namespace {

constexpr UINT kTrayCallbackMessage = WM_APP + 1;
constexpr UINT kTrayId = 1;
NOTIFYICONDATA g_nid{};
HWND g_hwnd = nullptr;

void AddTrayIcon(HWND hwnd) {
  g_nid = {};
  g_nid.cbSize = sizeof(g_nid);
  g_nid.hWnd = hwnd;
  g_nid.uID = kTrayId;
  g_nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
  g_nid.uCallbackMessage = kTrayCallbackMessage;
  g_nid.hIcon = LoadIcon(GetModuleHandle(nullptr), MAKEINTRESOURCE(101));  // app icon
  wcscpy_s(g_nid.szTip, L"Simple Web Server");
  Shell_NotifyIcon(NIM_ADD, &g_nid);
}

void RemoveTrayIcon() { Shell_NotifyIcon(NIM_DELETE, &g_nid); }

void ShowMainWindow() {
  if (g_hwnd) {
    ShowWindow(g_hwnd, SW_SHOW);
    SetForegroundWindow(g_hwnd);
  }
}

}  // namespace

// Call once, after the main window (HWND) is created.
void SwsInitTrayBackground(HWND hwnd) {
  g_hwnd = hwnd;

  // Start servers now — before any user interaction, so background mode works
  // even if the user immediately closes the window.
  sws::AppCore::instance().start();

  if (sws::AppCore::instance().tray()) {
    AddTrayIcon(hwnd);
  }
}

// Install this as a window subclass proc (SetWindowSubclass) on the main window.
LRESULT CALLBACK SwsWindowProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam,
                               UINT_PTR, DWORD_PTR) {
  switch (msg) {
    case WM_CLOSE:
      // Electron: if background, hide instead of close (keeps servers running,
      // removes the taskbar button). Otherwise fall through to real close.
      if (sws::AppCore::instance().background()) {
        ShowWindow(hwnd, SW_HIDE);
        return 0;
      }
      sws::AppCore::instance().shutdown();
      break;

    case kTrayCallbackMessage:
      if (LOWORD(lParam) == WM_LBUTTONUP || LOWORD(lParam) == WM_LBUTTONDBLCLK) {
        ShowMainWindow();
      }
      return 0;

    case WM_DESTROY:
      RemoveTrayIcon();
      break;
  }
  return DefSubclassProc(hwnd, msg, wParam, lParam);
}

// Call when the tray setting changes (e.g. from SaveConfig) to add/remove the
// icon to match config.tray.
void SwsApplyTraySetting() {
  if (sws::AppCore::instance().tray()) {
    if (!g_nid.hWnd && g_hwnd) {
      AddTrayIcon(g_hwnd);
    }
  } else if (g_nid.hWnd) {
    RemoveTrayIcon();
    g_nid = {};
  }
}
