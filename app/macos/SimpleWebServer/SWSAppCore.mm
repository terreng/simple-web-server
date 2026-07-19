#import "SWSAppCore.h"
#import <AppKit/AppKit.h>
#import <ifaddrs.h>
#import <arpa/inet.h>
#import <net/if.h>

#import "SWSConfigStore.h"
#import "SWSBookmarks.h"
#include "SwsSupervisor.hpp"
extern "C" {
#include "sws_ffi.h"
}

using sws::ServerDesc;
using sws::SwsSupervisor;

static BOOL numBool(NSDictionary *d, NSString *key, BOOL def) {
  id v = d[key];
  return [v isKindOfClass:[NSNumber class]] ? [v boolValue] : def;
}
static NSString *strVal(NSDictionary *d, NSString *key, NSString *def) {
  id v = d[key];
  return [v isKindOfClass:[NSString class]] ? v : def;
}
static std::string cpp(NSString *s) { return std::string(s ? s.UTF8String : ""); }

static ServerDesc descFromDict(NSDictionary *d) {
  ServerDesc desc;
  desc.enabled = numBool(d, @"enabled", NO);
  desc.path = cpp(strVal(d, @"path", @""));
  desc.port = [d[@"port"] isKindOfClass:[NSNumber class]] ? [d[@"port"] intValue] : 8080;
  desc.localnetwork = numBool(d, @"localnetwork", NO);
  desc.showIndex = numBool(d, @"showIndex", YES);
  desc.spa = numBool(d, @"spa", NO);
  desc.rewriteTo = cpp(strVal(d, @"rewriteTo", @"/index.html"));
  desc.directoryListing = numBool(d, @"directoryListing", YES);
  desc.excludeDotHtml = numBool(d, @"excludeDotHtml", NO);
  desc.ipv6 = numBool(d, @"ipv6", NO);
  desc.hiddenDotFiles = numBool(d, @"hiddenDotFiles", NO);
  desc.cors = numBool(d, @"cors", NO);
  desc.upload = numBool(d, @"upload", NO);
  desc.replace = numBool(d, @"replace", NO);
  desc.deleteFiles = numBool(d, @"delete", NO);
  desc.hiddenDotFilesDirectoryListing = numBool(d, @"hiddenDotFilesDirectoryListing", YES);
  desc.custom404 = cpp(strVal(d, @"custom404", @""));
  desc.custom403 = cpp(strVal(d, @"custom403", @""));
  desc.custom401 = cpp(strVal(d, @"custom401", @""));
  desc.custom500 = cpp(strVal(d, @"custom500", @""));
  desc.https = numBool(d, @"https", NO);
  desc.httpsCert = cpp(strVal(d, @"httpsCert", @""));
  desc.httpsKey = cpp(strVal(d, @"httpsKey", @""));
  desc.httpAuth = numBool(d, @"httpAuth", NO);
  desc.httpAuthUsername = cpp(strVal(d, @"httpAuthUsername", @""));
  desc.httpAuthPassword = cpp(strVal(d, @"httpAuthPassword", @""));
  return desc;
}

// The reverse: a ServerDesc back into the exact config dictionary shape the UI
// stored, so configsEqual() on the JS side keeps matching states to servers.
static NSDictionary *dictFromDesc(const ServerDesc &d) {
  return @{
    @"enabled": @(d.enabled),
    @"path": @(d.path.c_str()),
    @"port": @(d.port),
    @"localnetwork": @(d.localnetwork),
    @"showIndex": @(d.showIndex),
    @"spa": @(d.spa),
    @"rewriteTo": @(d.rewriteTo.c_str()),
    @"directoryListing": @(d.directoryListing),
    @"excludeDotHtml": @(d.excludeDotHtml),
    @"ipv6": @(d.ipv6),
    @"hiddenDotFiles": @(d.hiddenDotFiles),
    @"cors": @(d.cors),
    @"upload": @(d.upload),
    @"replace": @(d.replace),
    @"delete": @(d.deleteFiles),
    @"hiddenDotFilesDirectoryListing": @(d.hiddenDotFilesDirectoryListing),
    @"custom404": @(d.custom404.c_str()),
    @"custom403": @(d.custom403.c_str()),
    @"custom401": @(d.custom401.c_str()),
    @"custom500": @(d.custom500.c_str()),
    @"https": @(d.https),
    @"httpsCert": @(d.httpsCert.c_str()),
    @"httpsKey": @(d.httpsKey.c_str()),
    @"httpAuth": @(d.httpAuth),
    @"httpAuthUsername": @(d.httpAuthUsername.c_str()),
    @"httpAuthPassword": @(d.httpAuthPassword.c_str()),
  };
}

@implementation SWSAppCore {
  SwsSupervisor _supervisor;
  SWSConfigStore *_store;
  SWSBookmarks *_bookmarks;
  NSStatusItem *_statusItem;
  NSTimer *_ipTimer;
  NSArray *_lastIp;
}

+ (SWSAppCore *)shared {
  static SWSAppCore *inst;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    inst = [[SWSAppCore alloc] init];
  });
  return inst;
}

- (instancetype)init {
  if ((self = [super init])) {
    _store = [[SWSConfigStore alloc] init];
    _bookmarks = [[SWSBookmarks alloc] init];

    __weak SWSAppCore *weakSelf = self;

    // Supervisor -> emit serverStates (hop to main thread).
    _supervisor.setStatesChanged([weakSelf] {
      dispatch_async(dispatch_get_main_queue(), ^{
        SWSAppCore *self2 = weakSelf;
        if (self2.onStatesChanged) {
          self2.onStatesChanged();
        }
      });
    });

    // MAS: wire security-scoped bookmark access around each server's lifetime.
    if ([SWSBookmarks isSandboxed]) {
      SWSBookmarks *bm = _bookmarks;
      _supervisor.setPathHooks(
          [bm](const std::string &path) -> std::string {
            NSString *p = [NSString stringWithUTF8String:path.c_str()];
            NSString *err = [bm acquire:p];
            return err ? std::string(err.UTF8String) : std::string();
          },
          [bm](const std::string &path) {
            NSString *p = [NSString stringWithUTF8String:path.c_str()];
            [bm release:p];
          });
    }

    _store.onExternalChange = ^(NSDictionary *cfg) {
      SWSAppCore *self2 = weakSelf;
      [self2 reconcileFromConfig:cfg];
      if (self2.onConfigReload) {
        self2.onConfigReload(cfg);
      }
    };
  }
  return self;
}

- (void)start {
  [self reconcileFromConfig:_store.config];
  _lastIp = [self ipList];
  _ipTimer = [NSTimer scheduledTimerWithTimeInterval:10.0
                                             repeats:YES
                                               block:^(NSTimer *timer) {
                                                 [self checkIpChange];
                                               }];
  [self applyAppearancePolicyHasVisibleWindow:YES];
}

- (void)shutdown {
  [_ipTimer invalidate];
  _supervisor.shutdownAll();
}

- (NSDictionary *)config {
  return _store.config;
}

- (NSString *)installSource {
  return [SWSBookmarks isSandboxed] ? @"macappstore" : @"website";
}

- (void)reconcileFromConfig:(NSDictionary *)config {
  std::vector<ServerDesc> desired;
  NSArray *servers = config[@"servers"];
  if ([servers isKindOfClass:[NSArray class]]) {
    for (id s in servers) {
      if ([s isKindOfClass:[NSDictionary class]]) {
        desired.push_back(descFromDict(s));
      }
    }
  }
  _supervisor.reconcile(desired);
}

- (void)saveConfig:(NSDictionary *)config {
  [_store save:config];
  [self reconcileFromConfig:config];
  [self applyAppearancePolicyHasVisibleWindow:[self hasVisibleWindow]];
  if (self.onStatesChanged) {
    self.onStatesChanged();
  }
}

- (NSArray *)serverStates {
  NSMutableArray *out = [NSMutableArray array];
  for (const auto &s : _supervisor.states()) {
    NSMutableDictionary *entry = [@{
      @"config": dictFromDesc(s.desc),
      @"state": @(sws::to_string(s.state)),
    } mutableCopy];
    if (!s.errorMessage.empty()) {
      entry[@"error_message"] = @(s.errorMessage.c_str());
    }
    [out addObject:entry];
  }
  return out;
}

- (NSDictionary *)generateCrypto {
  char *cert = NULL, *key = NULL;
  if (!sws_generate_cert_and_key(&cert, &key)) {
    return nil;
  }
  NSDictionary *result = @{
    @"cert": @(cert),
    @"privateKey": @(key),
  };
  sws_string_free(cert);
  sws_string_free(key);
  return result;
}

- (NSString *)showFolderPicker:(NSString *)currentPath {
  NSOpenPanel *panel = [NSOpenPanel openPanel];
  panel.canChooseDirectories = YES;
  panel.canChooseFiles = NO;
  panel.canCreateDirectories = YES;
  panel.allowsMultipleSelection = NO;
  if (currentPath.length) {
    panel.directoryURL = [NSURL fileURLWithPath:currentPath];
  }
  if ([panel runModal] != NSModalResponseOK || !panel.URLs.firstObject) {
    return nil;
  }
  NSURL *url = panel.URLs.firstObject;

  if ([SWSBookmarks isSandboxed]) {
    NSError *err = nil;
    NSData *bookmark =
        [url bookmarkDataWithOptions:NSURLBookmarkCreationWithSecurityScope
      includingResourceValuesForKeys:nil
                       relativeToURL:nil
                               error:&err];
    if (bookmark) {
      [_bookmarks addPath:url.path bookmark:bookmark];
    }
  }
  return url.path;
}

#pragma mark - Background / tray

- (BOOL)hasVisibleWindow {
  for (NSWindow *w in NSApp.windows) {
    if (w.isVisible && ![w isKindOfClass:NSClassFromString(@"NSStatusBarWindow")]) {
      return YES;
    }
  }
  return NO;
}

- (void)applyAppearancePolicyHasVisibleWindow:(BOOL)hasVisibleWindow {
  BOOL background = numBool(_store.config, @"background", NO);
  BOOL tray = numBool(_store.config, @"tray", NO);

  // Dock icon: shown while a window is visible. When running headless in the
  // background (no window), hide the dock icon — mirroring app.dock.hide().
  NSApplicationActivationPolicy policy =
      (background && !hasVisibleWindow) ? NSApplicationActivationPolicyAccessory
                                        : NSApplicationActivationPolicyRegular;
  if (NSApp.activationPolicy != policy) {
    [NSApp setActivationPolicy:policy];
  }

  // Menu-bar (status) item.
  if (tray && !_statusItem) {
    _statusItem = [[NSStatusBar systemStatusBar]
        statusItemWithLength:NSVariableStatusItemLength];
    NSImage *icon = [NSImage imageNamed:@"menuBarIconTemplate"];
    icon.template = YES;
    _statusItem.button.image = icon;
    _statusItem.button.toolTip = @"Simple Web Server";
    _statusItem.button.target = self;
    _statusItem.button.action = @selector(statusItemClicked);
  } else if (!tray && _statusItem) {
    [[NSStatusBar systemStatusBar] removeStatusItem:_statusItem];
    _statusItem = nil;
  }
}

- (void)statusItemClicked {
  [NSApp setActivationPolicy:NSApplicationActivationPolicyRegular];
  [NSApp activateIgnoringOtherApps:YES];
  // Ask the app delegate to (re)create the main window if needed.
  [[NSNotificationCenter defaultCenter] postNotificationName:@"SWSShowMainWindow"
                                                      object:nil];
}

#pragma mark - IP monitoring

- (void)checkIpChange {
  NSArray *ip = [self ipList];
  if (![ip isEqualToArray:_lastIp]) {
    _lastIp = ip;
    if (self.onIpChanged) {
      self.onIpChanged(ip);
    }
  }
}

- (NSArray *)ipList {
  NSMutableArray *ips = [NSMutableArray array];
  NSString *hostname = [[NSProcessInfo processInfo] hostName];
  NSSet *nonLan = [NSSet setWithArray:@[@"127.0.0.1", @"::1", hostname ?: @""]];

  struct ifaddrs *ifaddr = NULL;
  if (getifaddrs(&ifaddr) == 0) {
    for (struct ifaddrs *ifa = ifaddr; ifa; ifa = ifa->ifa_next) {
      if (!ifa->ifa_addr) {
        continue;
      }
      int family = ifa->ifa_addr->sa_family;
      if (family != AF_INET && family != AF_INET6) {
        continue;
      }
      char host[NI_MAXHOST];
      if (getnameinfo(ifa->ifa_addr,
                      family == AF_INET ? sizeof(struct sockaddr_in)
                                        : sizeof(struct sockaddr_in6),
                      host, sizeof(host), NULL, 0, NI_NUMERICHOST) != 0) {
        continue;
      }
      NSString *addr = [NSString stringWithUTF8String:host];
      // Strip zone id from link-local IPv6 and skip fe80:: (matches Electron).
      NSString *bare = [addr componentsSeparatedByString:@"%"].firstObject;
      if ([bare hasPrefix:@"fe80:"]) {
        continue;
      }
      NSString *fam = (family == AF_INET) ? @"ipv4" : @"ipv6";
      BOOL isLan = ![nonLan containsObject:bare];
      [ips addObject:@[bare, fam, @(isLan)]];
    }
    freeifaddrs(ifaddr);
  }
  if (hostname.length) {
    [ips addObject:@[hostname, @"ipv4", @(![nonLan containsObject:hostname])]];
  }
  return ips;
}

@end
