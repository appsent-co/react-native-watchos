// watchOS fork of `<React/RCTBridgeModule.h>`. Slim subset of the
// upstream surface, kept under upstream names so cross-platform `.mm`
// files compile on both slices. `RCT_EXPORT_METHOD*` macros emit the
// ObjC method AND a sibling `+(const RCTMethodInfo *)__rct_export__*`
// stash that `RNWNativeModules.mm` walks at first-access — mirrors
// upstream `RCTInteropTurboModule`.

#pragma once

#import <Foundation/Foundation.h>
#import <React/RCTDefines.h>
#import <React/RCTModuleMethod.h>

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

#define _RCT_EXTERN_REMAP_METHOD(js_name, method, is_blocking_synchronous_method)             \
  +(const RCTMethodInfo *)RCT_CONCAT(__rct_export__,                                           \
      RCT_CONCAT(js_name, RCT_CONCAT(__LINE__, __COUNTER__))) {                                \
    static RCTMethodInfo config = {#js_name, #method, is_blocking_synchronous_method};         \
    return &config;                                                                            \
  }

#define RCT_EXPORT_METHOD(method)                          _RCT_EXTERN_REMAP_METHOD(, method, NO)  -(void)method
#define RCT_REMAP_METHOD(js_name, method)                  _RCT_EXTERN_REMAP_METHOD(js_name, method, NO) -(void)method
#define RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(method)     _RCT_EXTERN_REMAP_METHOD(, method, YES) -(id)method
#define RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(returnType, method) _RCT_EXTERN_REMAP_METHOD(, method, YES) -(returnType)method

NS_ASSUME_NONNULL_END
