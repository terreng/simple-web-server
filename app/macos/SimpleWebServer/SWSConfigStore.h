// SWSConfigStore — reads/writes/watches config.json in Application Support,
// mirroring the Electron main process. On the Mac App Store build this lives in
// the app's sandbox container automatically.
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface SWSConfigStore : NSObject

/// config.json as a dictionary ({} if missing/invalid).
@property(nonatomic, readonly) NSDictionary *config;

/// Fired when config.json changes on disk from outside this process (matches the
/// Electron "reload UI on external config change" behavior). Not fired for our
/// own saves.
@property(nonatomic, copy, nullable) void (^onExternalChange)(NSDictionary *config);

- (instancetype)init;

/// Persist a new config dictionary (atomic write). Does not trigger
/// onExternalChange.
- (void)save:(NSDictionary *)config;

/// Absolute path to config.json.
- (NSString *)configPath;

@end

NS_ASSUME_NONNULL_END
