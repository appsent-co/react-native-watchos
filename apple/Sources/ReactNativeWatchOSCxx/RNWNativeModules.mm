// Dispatcher for `RCT_EXPORT_MODULE` ObjC modules. Scans each class's
// metaclass for `__rct_export__*` stashes, parses each via
// `RCTParseMethodSignature`, then dispatches through `ObjCTurboModule`.
// Mirrors iOS's `RCTInteropTurboModule`.

#import "RNWNativeModules.h"

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTLog.h>
#import <React/RCTModuleMethod.h>
#import <ReactCommon/RCTTurboModule.h>
#import "ReactNativeWatchOSCxx/RNWTurboModuleRegistry.h"

#import <objc/runtime.h>

#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>

namespace facebook::react {

namespace {

class InteropObjCTurboModule final : public ObjCTurboModule {
   public:
    using ObjCTurboModule::ObjCTurboModule;

    // Interop path has no per-method return type info — every `id`
    // reports `@`. Dispatch on the runtime class instead.
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

    NSString *getArgumentTypeName(
        jsi::Runtime &runtime,
        NSString *methodName,
        int argIndex) override {
        NSArray<NSString *> *names = methodArgumentTypeNames_[methodName];
        if (names == nil || argIndex < 0 || (NSUInteger)argIndex >= names.count) {
            return nil;
        }
        NSString *type = names[argIndex];
        return type.length > 0 ? type : nil;
    }

    void setMethodArgumentTypeNames(
        NSDictionary<NSString *, NSArray<NSString *> *> *names) {
        methodArgumentTypeNames_ = [names copy];
    }

   private:
    NSDictionary<NSString *, NSArray<NSString *> *> *methodArgumentTypeNames_ = nil;
};

struct MethodDescriptor {
    SEL selector;
    TurboModuleMethodValueKind kind;
    NSUInteger jsArgCount;
    NSArray<NSString *> *argTypeNames;
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

        NSMutableDictionary<NSString *, NSArray<NSString *> *> *typeNamesDict =
            [NSMutableDictionary dictionaryWithCapacity:entry.methods.size()];
        for (const auto &kv : entry.methods) {
            if (kv.second.argTypeNames == nil) {
                continue;
            }
            NSString *jsKey = [NSString stringWithUTF8String:kv.first.c_str()];
            typeNamesDict[jsKey] = kv.second.argTypeNames;
        }
        entry.turboModule->setMethodArgumentTypeNames(typeNamesDict);

        auto [inserted, ok] = entries_.emplace(key, std::move(entry));
        return &inserted->second;
    }

   private:
    static std::unordered_map<std::string, MethodDescriptor> buildMethodMap(Class cls) {
        std::unordered_map<std::string, MethodDescriptor> map;
        // Walk to NSObject so subclasses inherit parent exports.
        for (Class c = cls; c && c != [NSObject class]; c = class_getSuperclass(c)) {
            Class meta = object_getClass(c);
            unsigned int count = 0;
            Method *methods = class_copyMethodList(meta, &count);
            if (methods == nullptr) {
                continue;
            }
            for (unsigned int i = 0; i < count; i++) {
                SEL exportSel = method_getName(methods[i]);
                const char *exportName = sel_getName(exportSel);
                if (exportName == nullptr ||
                    strncmp(exportName, "__rct_export__", 14) != 0) {
                    continue;
                }
                using GetInfoFn = const RCTMethodInfo *(*)(id, SEL);
                GetInfoFn getInfo = (GetInfoFn)method_getImplementation(methods[i]);
                const RCTMethodInfo *info = getInfo(c, exportSel);
                if (info == nullptr || info->objcName == nullptr) {
                    continue;
                }

                NSArray<RCTMethodArgument *> *parsedArgs = nil;
                NSString *selectorStr = RCTParseMethodSignature(info->objcName, &parsedArgs);
                if (selectorStr.length == 0) {
                    continue;
                }
                SEL selector = NSSelectorFromString(selectorStr);

                std::string jsName;
                if (info->jsName != nullptr && info->jsName[0] != '\0') {
                    jsName = info->jsName;
                } else {
                    std::string sel([selectorStr UTF8String]);
                    size_t colon = sel.find(':');
                    jsName = (colon == std::string::npos) ? sel : sel.substr(0, colon);
                }
                if (jsName.empty()) {
                    continue;
                }
                // First wins — subclass shadows parent on same JS name.
                if (map.find(jsName) != map.end()) {
                    continue;
                }

                NSMethodSignature *sig = [c instanceMethodSignatureForSelector:selector];
                if (sig == nil) {
                    RCTLogWarn(
                        @"[RNWNativeModules] %@: __rct_export__ references "
                        @"unimplemented selector %@; skipping.",
                        NSStringFromClass(c), selectorStr);
                    continue;
                }

                NSUInteger argCount = parsedArgs.count;
                TurboModuleMethodValueKind kind;
                if (info->isSync) {
                    const char *ret = sig.methodReturnType;
                    kind = (ret != nullptr && ret[0] == 'v') ? VoidKind : ObjectKind;
                } else if (argCount >= 2 &&
                           [parsedArgs[argCount - 2].type isEqualToString:@"RCTPromiseResolveBlock"] &&
                           [parsedArgs[argCount - 1].type isEqualToString:@"RCTPromiseRejectBlock"]) {
                    kind = PromiseKind;
                } else {
                    kind = VoidKind;
                }

                NSMutableArray<NSString *> *typeNames =
                    [NSMutableArray arrayWithCapacity:argCount];
                for (RCTMethodArgument *arg in parsedArgs) {
                    [typeNames addObject:arg.type ?: @""];
                }

                MethodDescriptor desc;
                desc.selector = selector;
                desc.kind = kind;
                desc.jsArgCount = argCount - (kind == PromiseKind ? 2 : 0);
                desc.argTypeNames = [typeNames copy];
                map.emplace(std::move(jsName), desc);
            }
            free(methods);
        }
        return map;
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
