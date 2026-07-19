#import "SWSConfigStore.h"

@implementation SWSConfigStore {
  NSDictionary *_config;
  dispatch_source_t _watchSource;
  int _watchFd;
  NSData *_lastWrittenData;  // to distinguish our writes from external ones
}

- (instancetype)init {
  if ((self = [super init])) {
    _config = [self loadFromDisk] ?: @{};
    [self startWatching];
  }
  return self;
}

- (void)dealloc {
  if (_watchSource) {
    dispatch_source_cancel(_watchSource);
  }
}

- (NSDictionary *)config {
  return _config;
}

- (NSString *)supportDir {
  NSArray<NSString *> *dirs = NSSearchPathForDirectoriesInDomains(
      NSApplicationSupportDirectory, NSUserDomainMask, YES);
  NSString *base = dirs.firstObject ?: NSTemporaryDirectory();
  NSString *appName =
      [[NSBundle mainBundle].infoDictionary[@"CFBundleName"] length]
          ? [NSBundle mainBundle].infoDictionary[@"CFBundleName"]
          : @"Simple Web Server";
  NSString *dir = [base stringByAppendingPathComponent:appName];
  [[NSFileManager defaultManager] createDirectoryAtPath:dir
                            withIntermediateDirectories:YES
                                             attributes:nil
                                                  error:nil];
  return dir;
}

- (NSString *)configPath {
  return [[self supportDir] stringByAppendingPathComponent:@"config.json"];
}

- (nullable NSDictionary *)loadFromDisk {
  NSData *data = [NSData dataWithContentsOfFile:[self configPath]];
  if (!data) {
    return nil;
  }
  id obj = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
  return [obj isKindOfClass:[NSDictionary class]] ? obj : nil;
}

- (void)save:(NSDictionary *)config {
  _config = config ?: @{};
  NSData *data = [NSJSONSerialization dataWithJSONObject:_config
                                                options:NSJSONWritingPrettyPrinted
                                                  error:nil];
  if (!data) {
    return;
  }
  _lastWrittenData = data;
  [data writeToFile:[self configPath] atomically:YES];
}

- (void)startWatching {
  // Ensure the file exists so we can open it for event monitoring.
  if (![[NSFileManager defaultManager] fileExistsAtPath:[self configPath]]) {
    [self save:_config];
  }
  _watchFd = open([self configPath].fileSystemRepresentation, O_EVTONLY);
  if (_watchFd < 0) {
    return;
  }
  dispatch_queue_t q = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0);
  _watchSource = dispatch_source_create(
      DISPATCH_SOURCE_TYPE_VNODE, _watchFd,
      DISPATCH_VNODE_WRITE | DISPATCH_VNODE_DELETE | DISPATCH_VNODE_RENAME, q);
  __weak SWSConfigStore *weakSelf = self;
  dispatch_source_set_event_handler(_watchSource, ^{
    SWSConfigStore *self2 = weakSelf;
    if (!self2) {
      return;
    }
    unsigned long flags = dispatch_source_get_data(self2->_watchSource);
    // Atomic writes replace the inode; re-arm the watch on delete/rename.
    if (flags & (DISPATCH_VNODE_DELETE | DISPATCH_VNODE_RENAME)) {
      dispatch_source_cancel(self2->_watchSource);
      self2->_watchSource = nil;
      close(self2->_watchFd);
      dispatch_after(
          dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.2 * NSEC_PER_SEC)),
          dispatch_get_main_queue(), ^{
            [self2 handleExternalChange];
            [self2 startWatching];
          });
      return;
    }
    dispatch_async(dispatch_get_main_queue(), ^{
      [self2 handleExternalChange];
    });
  });
  dispatch_source_set_cancel_handler(_watchSource, ^{
  });
  dispatch_resume(_watchSource);
}

- (void)handleExternalChange {
  NSData *data = [NSData dataWithContentsOfFile:[self configPath]];
  if (data && _lastWrittenData && [data isEqualToData:_lastWrittenData]) {
    return;  // our own write
  }
  NSDictionary *fresh = [self loadFromDisk];
  if (!fresh) {
    return;
  }
  if ([fresh isEqualToDictionary:_config]) {
    return;
  }
  _config = fresh;
  if (self.onExternalChange) {
    self.onExternalChange(fresh);
  }
}

@end
