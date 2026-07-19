// SWSUpdater — macOS auto-update via Sparkle (non-App-Store builds only).
//
// Sparkle is the standard macOS updater: it reads a signed appcast feed, checks
// in the background, and installs updates. On the Mac App Store build there is no
// self-updater (the store handles updates), so this object becomes a no-op when
// sandboxed, and the Sparkle framework is simply not linked into the MAS target.
//
// It compiles with or without Sparkle present (guarded by __has_include), so the
// project builds before you add the dependency — `available` just returns NO.
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface SWSUpdater : NSObject

+ (instancetype)shared;

/// YES when a real updater is active (Sparkle linked and not sandboxed).
@property(nonatomic, readonly) BOOL available;

/// Enable/disable automatic background update checks (driven by the "Check for
/// updates" setting). No-op when unavailable.
- (void)setAutomaticChecksEnabled:(BOOL)enabled;

/// Show the "check for updates" UI now (from a menu item / settings button).
- (void)checkForUpdates;

@end

NS_ASSUME_NONNULL_END
