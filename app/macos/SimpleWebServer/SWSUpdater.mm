#import "SWSUpdater.h"
#import "SWSBookmarks.h"

#if __has_include(<Sparkle/Sparkle.h>)
#import <Sparkle/Sparkle.h>
#define SWS_HAS_SPARKLE 1
#endif

@implementation SWSUpdater {
#if SWS_HAS_SPARKLE
  SPUStandardUpdaterController *_controller;
#endif
}

+ (instancetype)shared {
  static SWSUpdater *inst;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    inst = [[SWSUpdater alloc] init];
  });
  return inst;
}

- (instancetype)init {
  if ((self = [super init])) {
#if SWS_HAS_SPARKLE
    // No self-updates in the sandboxed App Store build.
    if (![SWSBookmarks isSandboxed]) {
      // Feed URL + public EdDSA key come from Info.plist (SUFeedURL,
      // SUPublicEDKey). See app/docs/UPDATER.md.
      _controller =
          [[SPUStandardUpdaterController alloc] initWithStartingUpdater:YES
                                                       updaterDelegate:nil
                                                    userDriverDelegate:nil];
    }
#endif
  }
  return self;
}

- (BOOL)available {
#if SWS_HAS_SPARKLE
  return _controller != nil;
#else
  return NO;
#endif
}

- (void)setAutomaticChecksEnabled:(BOOL)enabled {
#if SWS_HAS_SPARKLE
  _controller.updater.automaticallyChecksForUpdates = enabled;
#endif
}

- (void)checkForUpdates {
#if SWS_HAS_SPARKLE
  [_controller checkForUpdates:nil];
#endif
}

@end
