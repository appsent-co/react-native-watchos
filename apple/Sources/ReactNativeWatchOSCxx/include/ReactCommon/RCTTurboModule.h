// watchOS fork of `<ReactCommon/RCTTurboModule.h>` (the iOS platform layer
// of RN's TurboModule core). Header layout matches upstream — this file
// lives at `Headers/ReactCommon/RCTTurboModule.h` inside the xcframework,
// so a maintainer's `#import <ReactCommon/RCTTurboModule.h>` resolves
// here on watchOS and to RN's pod on iOS. The two never coexist in the
// same translation unit (separate Xcode targets per platform), so the
// shared name is safe.
//
// Differences vs upstream:
//
//   - `<React/RCTBridge.h>` import dropped — there's no `RCTBridge` on
//     watchOS. The host plugs the `CallInvoker` /
//     `NativeMethodCallInvoker` into `ObjCTurboModule::InitParams`
//     directly via `RNWTurboModuleRegistry`.
//   - The `RCTBridge (RCTTurboModule)` category at the end of upstream
//     is dropped (we have no `RCTBridge`).
//   - The class lives in `facebook::react::ObjCTurboModule` — same
//     namespace + name as upstream. Codegen-emitted `Native<Foo>SpecJSI`
//     classes inherit from that exact symbol; keeping the name means
//     codegen output drops in without rewriting.
//
// We do NOT compile upstream's platform/ios sources, so there's no
// duplicate-symbol risk — only our fork ends up in the static archive.

#pragma once

#import <Foundation/Foundation.h>

#import <React/RCTBridgeModule.h>
#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/TurboModule.h>

#include <functional>
#include <memory>
#include <string>
#include <unordered_map>

namespace facebook::react {

using EventEmitterCallback = std::function<void(const std::string &, id)>;

namespace TurboModuleConvertUtils {

/// Convert an ObjC value (NSString / NSNumber / NSArray / NSDictionary /
/// kCFNull) to its JSI equivalent. Unknown classes return `undefined`.
jsi::Value convertObjCObjectToJSIValue(jsi::Runtime &runtime, id value);

/// Convert a JSI value to its ObjC counterpart. Functions become
/// `RCTResponseSenderBlock`-style callbacks bound to the JS thread via
/// `jsInvoker`. If `useNSNull` is YES, JS `null` maps to `kCFNull`;
/// otherwise `null` becomes `nil`.
id convertJSIValueToObjCObject(
    jsi::Runtime &runtime,
    const jsi::Value &value,
    const std::shared_ptr<CallInvoker> &jsInvoker,
    BOOL useNSNull = NO);

}  // namespace TurboModuleConvertUtils

// Bridging<id> specialization so codegen-emitted spec code that reads
// ObjC return values via the bridging templates compiles unchanged.
template <>
struct Bridging<id> {
    static jsi::Value toJs(jsi::Runtime &rt, const id &value)
    {
        return TurboModuleConvertUtils::convertObjCObjectToJSIValue(rt, value);
    }
};

/// Base class every codegen-emitted `Native<Foo>SpecJSI` inherits from.
/// Holds an ObjC instance + invokers, and dispatches JS method calls
/// through `NSInvocation` into the maintainer's ObjC class.
class JSI_EXPORT ObjCTurboModule : public TurboModule {
 public:
    struct InitParams {
        std::string moduleName;
        id<RCTBridgeModule> instance;
        std::shared_ptr<CallInvoker> jsInvoker;
        std::shared_ptr<NativeMethodCallInvoker> nativeMethodCallInvoker;
        bool isSyncModule;
        bool shouldVoidMethodsExecuteSync;
    };

    ObjCTurboModule(const InitParams &params);

    /// Dispatch a single method call. Called from the generated method
    /// thunks in `Native<Foo>SpecJSI::methodMap_`. Resolves the selector
    /// against `instance_`, builds an `NSInvocation`, runs it on the
    /// native method queue, and converts the return back to JSI.
    jsi::Value invokeObjCMethod(
        jsi::Runtime &runtime,
        TurboModuleMethodValueKind returnType,
        const std::string &methodName,
        SEL selector,
        const jsi::Value *args,
        size_t count);

    id<RCTBridgeModule> instance_;
    std::shared_ptr<NativeMethodCallInvoker> nativeMethodCallInvoker_;

 protected:
    void setEventEmitterCallback(EventEmitterCallback eventEmitterCallback);

    /// Default conversion from ObjC return value → JSI, dispatching on
    /// the codegen-supplied `TurboModuleMethodValueKind`. Overridable by
    /// custom subclasses, but the codegen default is fine for v1.
    virtual jsi::Value convertReturnIdToJSIValue(
        jsi::Runtime &runtime,
        const char *methodName,
        TurboModuleMethodValueKind returnType,
        id result);

    /// Assigns one converted ObjC arg into the NSInvocation at index
    /// `i + 2` (the `+2` skips `self` + `_cmd`). v1 supports the
    /// JSON-mappable subset only: bool, double, NSInteger, NSString,
    /// NSArray, NSDictionary, RCTResponseSenderBlock. Custom types
    /// (UIColor/UIImage/structs) need a maintainer-side hop in their
    /// method body.
    virtual void setInvocationArg(
        jsi::Runtime &runtime,
        const char *methodName,
        const std::string &objCArgType,
        const jsi::Value &arg,
        size_t i,
        NSInvocation *inv,
        NSMutableArray *retainedObjectsForInvocation);

 private:
    const bool isSyncModule_;
    const bool shouldVoidMethodsExecuteSync_;

    bool isMethodSync(TurboModuleMethodValueKind returnType);

    NSInvocation *createMethodInvocation(
        jsi::Runtime &runtime,
        bool isSync,
        const char *methodName,
        SEL selector,
        const jsi::Value *args,
        size_t count,
        NSMutableArray *retainedObjectsForInvocation);
    id performMethodInvocation(
        jsi::Runtime &runtime,
        bool isSync,
        const char *methodName,
        NSInvocation *inv,
        NSMutableArray *retainedObjectsForInvocation);
    void performVoidMethodInvocation(
        jsi::Runtime &runtime,
        const char *methodName,
        NSInvocation *inv,
        NSMutableArray *retainedObjectsForInvocation);

    using PromiseInvocationBlock = void (^)(
        RCTPromiseResolveBlock resolveWrapper,
        RCTPromiseRejectBlock rejectWrapper);
    jsi::Value createPromise(
        jsi::Runtime &runtime,
        const std::string &methodName,
        PromiseInvocationBlock invoke);
};

}  // namespace facebook::react

/// Wraps a C++ `EventEmitterCallback` so it can be passed across the ObjC
/// boundary in `-setEventEmitterCallback:`.
@interface EventEmitterCallbackWrapper : NSObject {
 @public
    facebook::react::EventEmitterCallback _eventEmitterCallback;
}
@end

/// Factory protocol every ObjC TurboModule conforms to. The maintainer's
/// `-getTurboModule:` returns the codegen-emitted SpecJSI subclass.
@protocol RCTModuleProvider <NSObject>
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
        (const facebook::react::ObjCTurboModule::InitParams &)params;
@end

/// Marker protocol so the registry can verify a class is actually meant
/// to be exposed as a TurboModule. Conformance gives access to the
/// optional event-emitter hookup.
@protocol RCTTurboModule <RCTModuleProvider>
@optional
- (void)setEventEmitterCallback:
        (EventEmitterCallbackWrapper *)eventEmitterCallbackWrapper;
@end
