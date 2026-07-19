// SWSBookmarks — macOS App Store security-scoped bookmarks, ported from the
// Electron bookmarks.js. Only meaningful in the sandboxed (MAS) build; on the
// direct-download build these methods are effectively no-ops.
//
// Flow:
//   - When the user picks a folder, the app creates a security-scoped bookmark
//     and stores it with `addPath:bookmark:`.
//   - Before a server serves that folder, `acquire:` resolves the bookmark and
//     calls startAccessingSecurityScopedResource. It returns nil on success, or
//     an error token ("bookmarkDataIsStale", etc.) the UI can surface.
//   - When the server stops, `release:` balances the access with
//     stopAccessingSecurityScopedResource (ref-counted per bookmark).
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface SWSBookmarks : NSObject

/// True when running as a sandboxed Mac App Store build.
+ (BOOL)isSandboxed;

- (instancetype)init;

/// Store a freshly-created security-scoped bookmark for a chosen folder.
- (void)addPath:(NSString *)path bookmark:(NSData *)bookmark;

/// Begin accessing the folder containing `path`. Returns nil on success or an
/// error token on failure (empty/missing bookmark => nil so non-MAS still works).
- (nullable NSString *)acquire:(NSString *)path;

/// Balance a previous acquire for `path`.
- (void)release:(NSString *)path;

@end

NS_ASSUME_NONNULL_END
