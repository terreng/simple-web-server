#import "SWSBookmarks.h"

@implementation SWSBookmarks {
  NSMutableDictionary<NSString *, NSString *> *_bookmarks;  // path -> base64 data
  NSMutableDictionary<NSString *, NSMutableDictionary *> *_inUse;  // storedPath -> {url,count}
}

+ (BOOL)isSandboxed {
  return NSProcessInfo.processInfo.environment[@"APP_SANDBOX_CONTAINER_ID"] != nil;
}

- (instancetype)init {
  if ((self = [super init])) {
    _bookmarks = [self loadFromDisk];
    _inUse = [NSMutableDictionary dictionary];
  }
  return self;
}

- (NSString *)storePath {
  NSArray<NSString *> *dirs = NSSearchPathForDirectoriesInDomains(
      NSApplicationSupportDirectory, NSUserDomainMask, YES);
  NSString *base = dirs.firstObject ?: NSTemporaryDirectory();
  NSString *appName =
      [NSBundle mainBundle].infoDictionary[@"CFBundleName"] ?: @"Simple Web Server";
  NSString *dir = [base stringByAppendingPathComponent:appName];
  [[NSFileManager defaultManager] createDirectoryAtPath:dir
                            withIntermediateDirectories:YES
                                             attributes:nil
                                                  error:nil];
  return [dir stringByAppendingPathComponent:@"mas_bookmarks.json"];
}

- (NSMutableDictionary *)loadFromDisk {
  NSData *data = [NSData dataWithContentsOfFile:[self storePath]];
  if (data) {
    id obj = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    // Stored as { path: { "bookmark": base64 } } to match the Electron file.
    if ([obj isKindOfClass:[NSDictionary class]]) {
      NSMutableDictionary *out = [NSMutableDictionary dictionary];
      [(NSDictionary *)obj enumerateKeysAndObjectsUsingBlock:^(id key, id val, BOOL *stop) {
        if ([val isKindOfClass:[NSDictionary class]] && val[@"bookmark"]) {
          out[key] = val[@"bookmark"];
        }
      }];
      return out;
    }
  }
  return [NSMutableDictionary dictionary];
}

- (void)persist {
  NSMutableDictionary *out = [NSMutableDictionary dictionary];
  [_bookmarks enumerateKeysAndObjectsUsingBlock:^(NSString *k, NSString *v, BOOL *stop) {
    out[k] = @{@"bookmark": v};
  }];
  NSData *data = [NSJSONSerialization dataWithJSONObject:out
                                                options:NSJSONWritingPrettyPrinted
                                                  error:nil];
  [data writeToFile:[self storePath] atomically:YES];
}

- (void)addPath:(NSString *)path bookmark:(NSData *)bookmark {
  if (!bookmark.length) {
    return;
  }
  _bookmarks[path] = [bookmark base64EncodedStringWithOptions:0];
  [self persist];
}

// Longest stored path that is `path` or an ancestor directory of it.
- (nullable NSString *)matchStoredPath:(NSString *)path {
  NSString *best = nil;
  for (NSString *stored in _bookmarks) {
    BOOL prefix = [path hasPrefix:stored] &&
                  (path.length == stored.length ||
                   [path characterAtIndex:stored.length] == '/' ||
                   [path characterAtIndex:stored.length] == '\\');
    if (prefix && (!best || stored.length > best.length)) {
      best = stored;
    }
  }
  return best;
}

- (nullable NSString *)acquire:(NSString *)path {
  NSString *stored = [self matchStoredPath:path];
  if (!stored) {
    // No bookmark: fine on the non-MAS build; on MAS this means we never got
    // permission, which the server will surface as a plain read failure.
    return nil;
  }

  NSMutableDictionary *entry = _inUse[stored];
  if (entry) {
    entry[@"count"] = @([entry[@"count"] integerValue] + 1);
    return nil;
  }

  NSData *data = [[NSData alloc] initWithBase64EncodedString:_bookmarks[stored]
                                                    options:0];
  if (!data) {
    return @"bookmarkInvalid";
  }
  BOOL stale = NO;
  NSError *error = nil;
  NSURL *url = [NSURL URLByResolvingBookmarkData:data
                                        options:NSURLBookmarkResolutionWithSecurityScope
                                  relativeToURL:nil
                            bookmarkDataIsStale:&stale
                                          error:&error];
  if (stale) {
    return @"bookmarkDataIsStale";
  }
  if (!url || error) {
    return error.localizedDescription ?: @"bookmarkResolveFailed";
  }
  if (![url startAccessingSecurityScopedResource]) {
    return @"startAccessingFailed";
  }
  _inUse[stored] = [@{@"url": url, @"count": @1} mutableCopy];
  return nil;
}

- (void)release:(NSString *)path {
  NSString *stored = [self matchStoredPath:path];
  if (!stored) {
    return;
  }
  NSMutableDictionary *entry = _inUse[stored];
  if (!entry) {
    return;
  }
  NSInteger count = [entry[@"count"] integerValue] - 1;
  if (count <= 0) {
    [(NSURL *)entry[@"url"] stopAccessingSecurityScopedResource];
    [_inUse removeObjectForKey:stored];
  } else {
    entry[@"count"] = @(count);
  }
}

@end
