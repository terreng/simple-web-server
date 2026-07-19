// SWSAppCore — the process-wide owner of the running servers on macOS.
//
// This is the key to "keep running with no window / no dock or menu-bar icon":
// the servers live here, owned by the app process (via AppDelegate), NOT by the
// React Native bridge. Closing the last window can tear down the UI/bridge while
// this object — and its servers — keep running. It mirrors how the Electron
// *main* process (not the renderer) owned the servers.
//
// AppDelegate calls `-start` at launch. The RN `ServerManager` module talks to
// the same singleton to reflect state in the UI and to push config edits.
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface SWSAppCore : NSObject

@property(class, readonly) SWSAppCore *shared;

/// Listener blocks (set by the RN module; nil when no UI is attached).
@property(nonatomic, copy, nullable) void (^onStatesChanged)(void);
@property(nonatomic, copy, nullable) void (^onIpChanged)(NSArray *ip);
@property(nonatomic, copy, nullable) void (^onConfigReload)(NSDictionary *config);

/// Call once from applicationDidFinishLaunching. Loads config and starts any
/// enabled servers immediately (before/without any window).
- (void)start;

/// Call from applicationWillTerminate.
- (void)shutdown;

- (NSDictionary *)config;
- (NSString *)installSource;  // "macappstore" | "website"
- (NSArray *)ipList;          // [[addr, family, isLan], ...]

/// Persist config and reconcile running servers to match it.
- (void)saveConfig:(NSDictionary *)config;

/// Current running-server states as [{config, state, error_message}, ...].
- (NSArray *)serverStates;

/// { "cert": ..., "privateKey": ... } or nil on failure.
- (nullable NSDictionary *)generateCrypto;

/// Show the folder picker (stores a security-scoped bookmark on MAS). Returns
/// the chosen path or nil.
- (nullable NSString *)showFolderPicker:(nullable NSString *)currentPath;

/// Apply background/tray settings to the app (dock visibility + menu-bar item).
- (void)applyAppearancePolicyHasVisibleWindow:(BOOL)hasVisibleWindow;

@end

NS_ASSUME_NONNULL_END
