// AppDelegate.reference.mm
//
// REFERENCE ONLY — not compiled as-is. `react-native-macos` generates an
// AppDelegate (subclass of RCTAppDelegate) when you run `npx react-native-macos-init`.
// Merge the pieces below into that generated AppDelegate to get:
//   1. Servers running at launch (before/without any window).
//   2. "Keep running when closed" (config.background) with the dock icon hidden.
//   3. Menu-bar item click re-opening the window.
//
// The heavy lifting lives in SWSAppCore; the AppDelegate only drives app
// lifecycle + window visibility, exactly like the Electron main process did in
// its `app.on('ready')`, `app.on('window-all-closed')`, and `app.on('activate')`
// handlers.

#import <AppKit/AppKit.h>
#import "SWSAppCore.h"

@interface AppDelegate () <NSWindowDelegate>
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
  // Start servers immediately — independent of the RN bridge/window.
  [[SWSAppCore shared] start];

  // Menu-bar item asks us to bring back the window.
  [[NSNotificationCenter defaultCenter]
      addObserverForName:@"SWSShowMainWindow"
                  object:nil
                   queue:[NSOperationQueue mainQueue]
              usingBlock:^(NSNotification *note) {
                [self showMainWindow];
              }];

  // ... call through to the RN-macOS generated launch code (creates the bridge
  //     + root view + main window) ...
  // [super applicationDidFinishLaunching:notification];

  // Track window close so we can flip the dock policy when going headless.
  for (NSWindow *w in NSApp.windows) {
    w.delegate = self;
  }
}

// Electron: app.on('window-all-closed') -> quit unless config.background.
- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
  BOOL background = [[[SWSAppCore shared] config][@"background"] boolValue];
  if (background) {
    // Hide the dock icon and keep running (servers stay up in SWSAppCore).
    [[SWSAppCore shared] applyAppearancePolicyHasVisibleWindow:NO];
    return NO;
  }
  [[SWSAppCore shared] shutdown];
  return YES;
}

// Electron: app.on('activate') / dock click -> re-show window.
- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender
                    hasVisibleWindows:(BOOL)flag {
  if (!flag) {
    [self showMainWindow];
  }
  return YES;
}

- (void)showMainWindow {
  [[SWSAppCore shared] applyAppearancePolicyHasVisibleWindow:YES];
  [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
  [NSApp activateIgnoringOtherApps:YES];
  // If the RN root window was released on close, recreate it here using the
  // same code path the generated AppDelegate uses at launch, then:
  // [self.window makeKeyAndOrderFront:nil];
  for (NSWindow *w in NSApp.windows) {
    if (![w isKindOfClass:NSClassFromString(@"NSStatusBarWindow")]) {
      [w makeKeyAndOrderFront:nil];
    }
  }
}

- (void)applicationWillTerminate:(NSNotification *)notification {
  [[SWSAppCore shared] shutdown];
}

@end
