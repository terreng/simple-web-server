#include "pch.h"
#include "SWSUpdater.h"

#include <appmodel.h>

#if __has_include(<winsparkle.h>)
#include <winsparkle.h>
#define SWS_HAS_WINSPARKLE 1
#endif

namespace sws {

// Placeholder appcast feed — see app/docs/UPDATER.md. Update to the real URL.
static constexpr wchar_t kAppcastUrl[] =
    L"https://simplewebserver.org/appcast-win.xml";

static bool isPackaged() {
  UINT32 len = 0;
  return GetCurrentPackageFullName(&len, nullptr) != APPMODEL_ERROR_NO_PACKAGE;
}

Updater& Updater::instance() {
  static Updater inst;
  return inst;
}

void Updater::start() {
#if SWS_HAS_WINSPARKLE
  if (started_ || isPackaged()) {
    return;  // no self-updates in the Store/MSIX build
  }
  win_sparkle_set_appcast_url_w(kAppcastUrl);
  // Set the EdDSA public key from your key pair (see docs). Example:
  // win_sparkle_set_eddsa_public_key("BASE64_ED25519_PUBLIC_KEY");
  win_sparkle_init();
  started_ = true;
#endif
}

void Updater::shutdown() {
#if SWS_HAS_WINSPARKLE
  if (started_) {
    win_sparkle_cleanup();
    started_ = false;
  }
#endif
}

bool Updater::available() const {
#if SWS_HAS_WINSPARKLE
  return !isPackaged();
#else
  return false;
#endif
}

void Updater::setAutomaticChecksEnabled(bool enabled) {
#if SWS_HAS_WINSPARKLE
  if (available()) {
    win_sparkle_set_automatic_check_for_updates(enabled ? 1 : 0);
  }
#else
  (void)enabled;
#endif
}

void Updater::checkForUpdates() {
#if SWS_HAS_WINSPARKLE
  if (available()) {
    win_sparkle_check_update_with_ui();
  }
#endif
}

}  // namespace sws
