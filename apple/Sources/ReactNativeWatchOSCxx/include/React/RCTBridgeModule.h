// watchOS fork of `<React/RCTBridgeModule.h>`. Upstream pulls UIKit (UIView,
// UIDevice), RCTDefines, RCTJSThread, RCTBundleManager — none of which exist
// on watchOS. We re-declare the slim subset that codegen-emitted spec
// classes + maintainer module bodies actually depend on, **using the
// upstream names** so cross-platform TurboModule sources compile against
// either fork unchanged:
//
//   - `RCTBridgeModule` protocol: the `+moduleName` class method that
//     identifies the module to JS.
//   - `RCTPromiseResolveBlock` / `RCTPromiseRejectBlock` /
//     `RCTResponseSenderBlock` / `RCTResponseErrorBlock` typedefs.
//   - `RCT_EXPORT_MODULE` macro: synthesizes `+moduleName` AND a `+load`
//     that registers the class with `RNWTurboModuleRegistry.shared`,
//     mirroring upstream RN's auto-registration behavior. Maintainers
//     write a single line and the module shows up in JS.
//
// Header layout matches upstream — this file lives at
// `Headers/React/RCTBridgeModule.h` inside the xcframework, so a
// maintainer's `#import <React/RCTBridgeModule.h>` resolves here on
// watchOS and to RN's pod on iOS. The two never coexist in the same
// translation unit (iOS host + watch extension are separate Xcode
// targets), so the shared name causes no collision and the same `.mm`
// gets the right auto-registration path on each platform.
//
// We do NOT ship the legacy `RCT_EXPORT_METHOD` / `RCT_REMAP_METHOD` /
// `RCT_EXPORT_SYNCHRONOUS_METHOD` macros. Those exist only to feed
// `RCTInteropTurboModule` (the runtime-parsing legacy bridge path),
// which is not ported. Codegen-emitted modules don't use them — they
// declare regular ObjC instance methods, and codegen wires the C++
// `methodMap_` directly.

#pragma once

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Sends an array response back to a JS callback.
typedef void (^RCTResponseSenderBlock)(NSArray *response);

/// Sends an error response back to a JS callback.
typedef void (^RCTResponseErrorBlock)(NSError *error);

/// Resolves the JS promise waiting for this method's result. Nil resolves
/// to `undefined`.
typedef void (^RCTPromiseResolveBlock)(id _Nullable result);

/// Rejects the JS promise. `error` may be nil but supplying an NSError
/// yields better stack traces on the JS side.
typedef void (^RCTPromiseRejectBlock)(
    NSString *code,
    NSString * _Nullable message,
    NSError * _Nullable error);

/// Marker protocol for TurboModule-providing classes. The codegen-emitted
/// `Native<Foo>Spec` protocol conforms to this + `RCTTurboModule`, and
/// the maintainer's class conforms to that combined protocol. Mirrors
/// `RCTBridgeModule` upstream, minus the bridge/registry/queue properties
/// that don't exist on watchOS.
@protocol RCTBridgeModule <NSObject>

/// Returns the JS-facing name of this module. Synthesized by
/// `RCT_EXPORT_MODULE(name)`. JS calls
/// `globalThis.__turboModuleProxy('<moduleName>')` to obtain the proxy.
+ (NSString *)moduleName;

@end

/// C entrypoint invoked from the `+load` synthesized by `RCT_EXPORT_MODULE`.
/// Bridges into `RNWTurboModuleRegistry.shared` without forcing every
/// module's translation unit to import the registry header.
///
/// Defined in `RNWTurboModuleRegistry.mm`.
FOUNDATION_EXTERN void RNWRegisterTurboModuleClass(NSString *name, Class moduleClass);

/// Place inside an `@implementation` block to synthesize `+moduleName`
/// AND auto-register the class with the local TurboModule registry on
/// image load (mirrors upstream RN's iOS behavior).
///
/// Requires the consumer target to link with `-ObjC` so the ObjC runtime
/// loads our class (and fires `+load`) from the static library. The
/// `@appsent-co/react-native-watchos` Expo plugin sets this automatically via
/// `withSPMPackage`.
#define RCT_EXPORT_MODULE(js_name)                                      \
  +(NSString *)moduleName { return @ #js_name; }                        \
  +(void)load { RNWRegisterTurboModuleClass(@ #js_name, self); }

NS_ASSUME_NONNULL_END
