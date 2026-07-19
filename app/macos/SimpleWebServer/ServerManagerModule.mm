#import "ServerManagerModule.h"
#import <AppKit/AppKit.h>
#import "SWSAppCore.h"

@implementation ServerManagerModule {
  BOOL _hasListeners;
}

// Registers this class with RN under the name "ServerManager".
RCT_EXPORT_MODULE(ServerManager);

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"serverStates", @"ipChange", @"configReload", @"update"];
}

- (void)startObserving {
  _hasListeners = YES;
  __weak ServerManagerModule *weakSelf = self;
  SWSAppCore *core = SWSAppCore.shared;

  core.onStatesChanged = ^{
    ServerManagerModule *self2 = weakSelf;
    if (self2->_hasListeners) {
      [self2 sendEventWithName:@"serverStates" body:[core serverStates]];
    }
  };
  core.onIpChanged = ^(NSArray *ip) {
    ServerManagerModule *self2 = weakSelf;
    if (self2->_hasListeners) {
      [self2 sendEventWithName:@"ipChange" body:ip];
    }
  };
  core.onConfigReload = ^(NSDictionary *config) {
    ServerManagerModule *self2 = weakSelf;
    if (self2->_hasListeners) {
      [self2 sendEventWithName:@"configReload" body:config];
    }
  };
}

- (void)stopObserving {
  _hasListeners = NO;
  SWSAppCore *core = SWSAppCore.shared;
  core.onStatesChanged = nil;
  core.onIpChanged = nil;
  core.onConfigReload = nil;
}

RCT_EXPORT_METHOD(getInitialState
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject) {
  SWSAppCore *core = SWSAppCore.shared;
  resolve(@{
    @"config": core.config ?: @{},
    @"ip": [core ipList],
    @"installSource": [core installSource],
    @"platform": @"darwin",
    @"version": [NSBundle mainBundle].infoDictionary[@"CFBundleShortVersionString"] ?: @"",
  });
}

RCT_EXPORT_METHOD(saveConfig : (NSDictionary *)config reload : (BOOL)reload) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [SWSAppCore.shared saveConfig:config];
  });
}

RCT_EXPORT_METHOD(getServerStates
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject) {
  resolve([SWSAppCore.shared serverStates]);
}

RCT_EXPORT_METHOD(generateCrypto
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject) {
  NSDictionary *crypto = [SWSAppCore.shared generateCrypto];
  if (crypto) {
    resolve(crypto);
  } else {
    reject(@"crypto_error", @"Failed to generate certificate", nil);
  }
}

RCT_EXPORT_METHOD(showFolderPicker
                  : (NSString *)currentPath resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *path = [SWSAppCore.shared
        showFolderPicker:(currentPath.length ? currentPath : nil)];
    resolve(path ?: [NSNull null]);
  });
}

RCT_EXPORT_METHOD(openExternal : (NSString *)url) {
  NSURL *nsurl = [NSURL URLWithString:url];
  if (nsurl) {
    [[NSWorkspace sharedWorkspace] openURL:nsurl];
  }
}

RCT_EXPORT_METHOD(quit) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [SWSAppCore.shared shutdown];
    [NSApp terminate:nil];
  });
}

@end
