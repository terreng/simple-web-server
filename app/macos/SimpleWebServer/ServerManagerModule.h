// ServerManagerModule — the React Native native module the JS `ServerManager`
// wrapper talks to. It is a thin adapter over the process-wide SWSAppCore: it
// forwards calls and re-emits the core's state/ip/config changes as RN events.
#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>

@interface ServerManagerModule : RCTEventEmitter <RCTBridgeModule>
@end
