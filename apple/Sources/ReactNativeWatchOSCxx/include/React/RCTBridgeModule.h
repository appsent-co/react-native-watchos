// watchOS fork of `<React/RCTBridgeModule.h>`. Slim subset of the
// upstream surface that codegen-emitted specs + maintainer modules
// depend on, kept under the upstream names so the same `.mm` compiles
// on both platforms. The legacy `RCT_EXPORT_METHOD*` macros expand to
// just the ObjC method signature — invocation is done from native code
// via `[RCTBridge.currentBridge moduleForName:@"<name>"]`, not via a
// JS-side bridge dispatcher (which doesn't exist here).

#pragma once

#import <Foundation/Foundation.h>

@class RCTBridge;

NS_ASSUME_NONNULL_BEGIN

typedef void (^RCTResponseSenderBlock)(NSArray *response);
typedef void (^RCTResponseErrorBlock)(NSError *error);
typedef void (^RCTPromiseResolveBlock)(id _Nullable result);
typedef void (^RCTPromiseRejectBlock)(
    NSString *code,
    NSString * _Nullable message,
    NSError * _Nullable error);

@protocol RCTBridgeModule <NSObject>

+ (NSString *)moduleName;

@optional

/// Set by `RCTBridge` on first materialization. JSI installer modules
/// read `_bridge.jsCallInvoker` / `_bridge.runtime` from here. Opt in
/// with `@synthesize bridge = _bridge;`.
@property (nonatomic, weak, readwrite, nullable) RCTBridge *bridge;

@end

FOUNDATION_EXTERN void RNWRegisterTurboModuleClass(NSString *name, Class moduleClass);

/// Upstream's auto-registration entrypoint for hand-rolled `+load`
/// hooks that don't use `RCT_EXPORT_MODULE`.
FOUNDATION_EXTERN void RCTRegisterModule(Class moduleClass);

/// Requires the consumer target to link with `-ObjC` so `+load` fires
/// from the static library. The Expo plugin sets this via `withSPMPackage`;
/// CocoaPods autolinking adds it via the generated `Pods-watch.xcconfig`.
#define RCT_EXPORT_MODULE(js_name)                                          \
  +(NSString *)moduleName {                                                 \
    NSString *_rnw_name = @ #js_name;                                       \
    return _rnw_name.length > 0 ? _rnw_name : NSStringFromClass(self);      \
  }                                                                         \
  +(void)load { RNWRegisterTurboModuleClass([self moduleName], self); }

// Legacy method-export macros collapse to the bare signature — no
// dispatcher on watchOS. Invocation goes through direct selector calls
// on `[RCTBridge.currentBridge moduleForName:@"X"]`.
#define RCT_EXPORT_METHOD(method)                       -(void)method
#define RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(method)  -(id)method
#define RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(returnType, method) -(returnType)method
#define RCT_REMAP_METHOD(js_name, method)               -(void)method

NS_ASSUME_NONNULL_END
