#import <Foundation/Foundation.h>
#import <ReactNativeWatchOSCxx/RNWShadowNode.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, RNWLogLevel) {
    RNWLogLevelLog,
    RNWLogLevelWarn,
    RNWLogLevelError,
    RNWLogLevelInfo,
};

/// Owns a Hermes JS runtime via JSI. The runtime lives on a private serial
/// dispatch queue (the "JS queue") so main-thread SwiftUI work isn't blocked.
/// All public methods are thread-safe — they hop to the JS queue internally.
///
/// Installs `globalThis.__RNW_log(level, message)` and a minimal one-arg
/// `console` bootstrap. The rich multi-arg shim lives in
/// `src/setupConsole.ts` and routes through `__RNW_log` to `onConsoleLog`.
@interface RNWHermesHost : NSObject

- (instancetype)init NS_DESIGNATED_INITIALIZER;

/// Evaluate a JS source string on the JS queue. `url` is the source URL
/// for stack traces. `completion` fires on the main queue with nil on
/// success.
- (void)evaluate:(NSString *)source
             url:(NSString *)url
      completion:(void (^)(NSError * _Nullable error))completion;

/// Called on the main queue for every `console.<level>(...)`.
@property (nonatomic, copy, nullable) void (^onConsoleLog)(RNWLogLevel level,
                                                           NSString *message);

/// Called on the main queue after every JS-side `completeRoot()`. Empty
/// roots send `@[]`; never nil.
@property (nonatomic, copy, nullable) void (^onCommit)(NSArray<RNWShadowNodeSnapshot *> *root);

/// Called on the main queue when JS invokes `globalThis.__RNW_RELOAD()`
/// (Fast Refresh full-reload path). Dispatched async off the current JS
/// callstack so the runtime can safely re-evaluate.
@property (nonatomic, copy, nullable) void (^onReloadRequest)(void);

/// Bridge from SwiftUI action closures into `globalThis.__RNW_EVENTS.dispatch`.
/// Fire-and-forget; no-op if the JS bridge isn't installed or the id is
/// unknown.
- (void)fireEventWithHandlerId:(NSInteger)handlerId
                       payload:(nullable id)payload;

/// Bridge from native `RCTEventEmitter sendEventWithName:body:` into
/// `globalThis.__RNW_EVENTS.dispatchEvent`. Fire-and-forget; no-op if the
/// bridge isn't installed or no listener is registered for the name.
- (void)fireEventByName:(NSString *)eventName
                payload:(nullable id)payload;

@end

NS_ASSUME_NONNULL_END
