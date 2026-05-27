// Dispatcher for legacy `RCT_EXPORT_MODULE` ObjC modules. Resolves a
// JS method name to an ObjC selector via runtime introspection,
// classifies sync/promise/void from the `NSMethodSignature`, then
// dispatches through `ObjCTurboModule` to reuse the codegen path's
// JSI↔ObjC conversion logic. Mirrors iOS's `RCTInteropTurboModule`.

#import "RNWNativeModules.h"

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <ReactCommon/RCTTurboModule.h>
#import "ReactNativeWatchOSCxx/RNWTurboModuleRegistry.h"

#import <objc/runtime.h>

#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>

namespace facebook::react {

namespace {

// Codegen's `ObjCTurboModule::convertReturnIdToJSIValue` assumes the
// spec pins down the ObjC return type per method. Interop path has no
// such info — every `id`-returning method reports `@`. Override to
// dispatch on the runtime class.
class InteropObjCTurboModule final : public ObjCTurboModule {
   public:
    using ObjCTurboModule::ObjCTurboModule;

    jsi::Value convertReturnIdToJSIValue(
        jsi::Runtime &runtime,
        const char *methodName,
        TurboModuleMethodValueKind returnType,
        id result) override {
        if (returnType == VoidKind) {
            return jsi::Value::undefined();
        }
        return TurboModuleConvertUtils::convertObjCObjectToJSIValue(runtime, result);
    }
};

struct MethodDescriptor {
    SEL selector;
    TurboModuleMethodValueKind kind;
    // JS-side arg count. Differs from the selector's colon count when
    // the method ends in `(resolve:reject:)` — JS passes neither block.
    NSUInteger jsArgCount;
};

struct ModuleEntry {
    std::shared_ptr<InteropObjCTurboModule> turboModule;
    std::unordered_map<std::string, MethodDescriptor> methods;
};

class InteropRegistry {
   public:
    static InteropRegistry &shared() {
        static InteropRegistry instance;
        return instance;
    }

    ModuleEntry *entryForName(NSString *name,
                              std::shared_ptr<CallInvoker> jsInvoker,
                              std::shared_ptr<NativeMethodCallInvoker> nativeInvoker) {
        std::lock_guard<std::mutex> lock(mutex_);
        std::string key([name UTF8String]);
        auto it = entries_.find(key);
        if (it != entries_.end()) {
            return &it->second;
        }
        id instance = [RNWTurboModuleRegistry.shared objcInstanceForName:name];
        if (instance == nil) {
            return nullptr;
        }
        ModuleEntry entry;
        ObjCTurboModule::InitParams params = {
            .moduleName = key,
            .instance = (id<RCTBridgeModule>)instance,
            .jsInvoker = jsInvoker,
            .nativeMethodCallInvoker = nativeInvoker,
            .isSyncModule = false,
            .shouldVoidMethodsExecuteSync = false,
        };
        entry.turboModule = std::make_shared<InteropObjCTurboModule>(params);
        entry.methods = buildMethodMap([instance class]);
        auto [inserted, ok] = entries_.emplace(key, std::move(entry));
        return &inserted->second;
    }

   private:
    static std::unordered_map<std::string, MethodDescriptor> buildMethodMap(Class cls) {
        std::unordered_map<std::string, MethodDescriptor> map;
        // Walk to NSObject so subclasses inherit parent selectors.
        for (Class c = cls; c && c != [NSObject class]; c = class_getSuperclass(c)) {
            unsigned int count = 0;
            Method *methods = class_copyMethodList(c, &count);
            if (methods == nullptr) {
                continue;
            }
            for (unsigned int i = 0; i < count; i++) {
                SEL sel = method_getName(methods[i]);
                const char *selName = sel_getName(sel);
                if (selName == nullptr) {
                    continue;
                }
                std::string fullSelector(selName);
                std::string jsName = fullSelector;
                size_t colon = jsName.find(':');
                if (colon != std::string::npos) {
                    jsName = jsName.substr(0, colon);
                }
                if (jsName.empty() ||
                    jsName[0] == '_' ||
                    jsName == "init" ||
                    jsName == "dealloc" ||
                    jsName == "self" ||
                    jsName == "class" ||
                    jsName == "description" ||
                    jsName == "debugDescription" ||
                    jsName == "hash" ||
                    jsName == "retain" ||
                    jsName == "release" ||
                    jsName == "autorelease" ||
                    jsName == "respondsToSelector" ||
                    jsName == "isKindOfClass" ||
                    jsName == "isMemberOfClass" ||
                    jsName == "conformsToProtocol" ||
                    jsName == "performSelector" ||
                    jsName == "isProxy" ||
                    jsName == "setBridge" ||
                    jsName == "bridge" ||
                    jsName == "moduleName" ||
                    jsName == "requiresMainQueueSetup" ||
                    jsName == "methodQueue" ||
                    jsName == "constantsToExport") {
                    continue;
                }
                // First wins — subclass shadows parent on same JS name.
                if (map.find(jsName) != map.end()) {
                    continue;
                }
                NSMethodSignature *sig = [c instanceMethodSignatureForSelector:sel];
                if (sig == nil) {
                    continue;
                }
                MethodDescriptor desc;
                desc.selector = sel;
                desc.kind = classifyMethod(sig);
                desc.jsArgCount = jsArgCountForSignature(sig, desc.kind);
                map.emplace(std::move(jsName), desc);
            }
            free(methods);
        }
        return map;
    }

    // Only Void / Promise / Object are reachable — `RCT_EXPORT_*` macros
    // only return `void` or `id`, and `ObjectKind` is rerouted through
    // `InteropObjCTurboModule`'s runtime-type-dispatching converter.
    static TurboModuleMethodValueKind classifyMethod(NSMethodSignature *sig) {
        NSUInteger argCount = sig.numberOfArguments;
        // Args 0/1 are self/_cmd; user args start at 2.
        if (argCount >= 4) {
            const char *penultimate = [sig getArgumentTypeAtIndex:argCount - 2];
            const char *last = [sig getArgumentTypeAtIndex:argCount - 1];
            if (isBlockEncoding(penultimate) && isBlockEncoding(last)) {
                return PromiseKind;
            }
        }
        const char *ret = sig.methodReturnType;
        if (ret == nullptr || ret[0] == 'v') {
            return VoidKind;
        }
        return ObjectKind;
    }

    static bool isBlockEncoding(const char *enc) {
        if (enc == nullptr) {
            return false;
        }
        return std::string(enc) == "@?";
    }

    static NSUInteger jsArgCountForSignature(NSMethodSignature *sig,
                                              TurboModuleMethodValueKind kind) {
        NSUInteger total = sig.numberOfArguments;
        NSUInteger userArgs = total >= 2 ? total - 2 : 0;
        if (kind == PromiseKind && userArgs >= 2) {
            return userArgs - 2;  // strip resolve + reject
        }
        return userArgs;
    }

    std::mutex mutex_;
    std::unordered_map<std::string, ModuleEntry> entries_;
};

jsi::Value invokeNativeModuleMethod(
    jsi::Runtime &runtime,
    std::shared_ptr<CallInvoker> jsInvoker,
    std::shared_ptr<NativeMethodCallInvoker> nativeInvoker,
    const jsi::Value *args,
    size_t count) {
    if (count < 2) {
        throw jsi::JSError(
            runtime,
            "__rnwInvokeNativeModuleMethod requires (moduleName, methodName, ...args)");
    }
    if (!args[0].isString() || !args[1].isString()) {
        throw jsi::JSError(
            runtime,
            "__rnwInvokeNativeModuleMethod: moduleName and methodName must be strings");
    }
    std::string moduleNameStr = args[0].getString(runtime).utf8(runtime);
    std::string methodNameStr = args[1].getString(runtime).utf8(runtime);
    NSString *moduleNS = [NSString stringWithUTF8String:moduleNameStr.c_str()];

    ModuleEntry *entry =
        InteropRegistry::shared().entryForName(moduleNS, jsInvoker, nativeInvoker);
    if (entry == nullptr) {
        throw jsi::JSError(
            runtime,
            "NativeModules: module '" + moduleNameStr + "' is not registered");
    }
    auto methodIt = entry->methods.find(methodNameStr);
    if (methodIt == entry->methods.end()) {
        throw jsi::JSError(
            runtime,
            "NativeModules." + moduleNameStr + "." + methodNameStr +
                "() is not a function (no matching ObjC selector found)");
    }
    const MethodDescriptor &desc = methodIt->second;

    size_t methodArgCount = count - 2;
    return entry->turboModule->invokeObjCMethod(
        runtime,
        desc.kind,
        methodNameStr,
        desc.selector,
        args + 2,
        methodArgCount);
}

jsi::Value getNativeModuleConstants(
    jsi::Runtime &runtime,
    std::shared_ptr<CallInvoker> jsInvoker,
    std::shared_ptr<NativeMethodCallInvoker> nativeInvoker,
    const jsi::Value *args,
    size_t count) {
    if (count < 1 || !args[0].isString()) {
        return jsi::Value::null();
    }
    std::string moduleNameStr = args[0].getString(runtime).utf8(runtime);
    NSString *moduleNS = [NSString stringWithUTF8String:moduleNameStr.c_str()];
    id instance = [RNWTurboModuleRegistry.shared objcInstanceForName:moduleNS];
    if (instance == nil) {
        return jsi::Value::null();
    }
    NSDictionary *constants = nil;
    // `-getConstants` (new-arch) takes priority over `-constantsToExport`.
    if ([instance respondsToSelector:@selector(getConstants)]) {
        constants = (NSDictionary *)[instance performSelector:@selector(getConstants)];
    } else if ([instance respondsToSelector:@selector(constantsToExport)]) {
        constants = (NSDictionary *)[instance performSelector:@selector(constantsToExport)];
    }
    if (constants == nil) {
        return jsi::Value::null();
    }
    return TurboModuleConvertUtils::convertObjCObjectToJSIValue(runtime, constants);
}

}  // namespace

void rnwInstallNativeModulesProxy(
    jsi::Runtime &runtime,
    std::shared_ptr<CallInvoker> jsInvoker,
    std::shared_ptr<NativeMethodCallInvoker> nativeInvoker) {
    auto invokeFn = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "__rnwInvokeNativeModuleMethod"),
        /*paramCount=*/2,
        [jsInvoker, nativeInvoker](
            jsi::Runtime &rt,
            const jsi::Value &,
            const jsi::Value *args,
            size_t count) -> jsi::Value {
            return invokeNativeModuleMethod(rt, jsInvoker, nativeInvoker, args, count);
        });
    runtime.global().setProperty(runtime, "__rnwInvokeNativeModuleMethod", invokeFn);

    auto constantsFn = jsi::Function::createFromHostFunction(
        runtime,
        jsi::PropNameID::forAscii(runtime, "__rnwGetNativeModuleConstants"),
        /*paramCount=*/1,
        [jsInvoker, nativeInvoker](
            jsi::Runtime &rt,
            const jsi::Value &,
            const jsi::Value *args,
            size_t count) -> jsi::Value {
            return getNativeModuleConstants(rt, jsInvoker, nativeInvoker, args, count);
        });
    runtime.global().setProperty(runtime, "__rnwGetNativeModuleConstants", constantsFn);
}

}  // namespace facebook::react
