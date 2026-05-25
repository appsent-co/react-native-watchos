// Internal ObjC++ header — Swift can't see the C++ types, so this lives
// outside the umbrella header and module authors include it from `.mm`.

#pragma once

#import <ReactNativeWatchOSCxx/RNWTurboModuleRegistry.h>

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>

#include <functional>
#include <memory>
#include <string>

namespace facebook::react {
class TurboModule;
class CallInvoker;
}  // namespace facebook::react

NS_ASSUME_NONNULL_BEGIN

/// Invoked lazily on the JS thread the first time JS calls
/// `__turboModuleProxy('<name>')`. Result is cached for the registry's life.
using RNWTurboModuleCxxFactory = std::function<
    std::shared_ptr<facebook::react::TurboModule>(
        std::shared_ptr<facebook::react::CallInvoker> jsInvoker)>;

/// Invoked from `+load` synthesized by `RNW_EXPORT_CXX_MODULE`.
FOUNDATION_EXTERN void RNWRegisterCxxTurboModule(NSString *name,
                                                 RNWTurboModuleCxxFactory factory);

/// Place at file scope in an `.mm` to auto-register a C++ TurboModule on
/// image load. Requires the consumer to link with `-ObjC` (the Expo plugin
/// sets this).
///
/// Example:
///
///   RNW_EXPORT_CXX_MODULE(Math, [](std::shared_ptr<facebook::react::CallInvoker> jsInvoker) {
///       return std::make_shared<NativeMathModule>(std::move(jsInvoker));
///   });
#define RNW_EXPORT_CXX_MODULE(js_name, factory_expr)                    \
  @interface RNWCxxAutoload_##js_name : NSObject                        \
  @end                                                                  \
  @implementation RNWCxxAutoload_##js_name                              \
  +(void)load { RNWRegisterCxxTurboModule(@ #js_name, factory_expr); }  \
  @end

@interface RNWTurboModuleRegistry (Cxx)

/// Prefer `RNW_EXPORT_CXX_MODULE`; this is for dynamic registration only.
- (void)registerCxxModuleNamed:(NSString *)name
                       factory:(RNWTurboModuleCxxFactory)factory;

/// Internal — resolves cached → C++ factory → ObjC factory, building the
/// `ObjCTurboModule` wrapper for the ObjC path. Returns `nullptr` if
/// nothing matches.
- (std::shared_ptr<facebook::react::TurboModule>)
        lookupModuleNamed:(NSString *)name
                jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
            nativeInvoker:(std::shared_ptr<facebook::react::NativeMethodCallInvoker>)nativeInvoker;

@end

NS_ASSUME_NONNULL_END
