// watchOS compat shim for `<React/RCTBridge.h>` + `<React/RCTBridge+Private.h>`
// + `<React/RCTUtils.h>` + the C `RCTRegisterModule` entrypoint. Passive:
// delegates module lookup to `RNWTurboModuleRegistry`, holds runtime +
// CallInvoker pointers that the host plugs in. Lifetimes are managed by
// the host — it clears the pointers before tearing down.

#import <React/RCTBridge.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import "ReactNativeWatchOSCxx/RNWTurboModuleRegistry.h"

#include <ReactCommon/CallInvoker.h>
#include <memory>

@implementation RCTBridge {
    std::shared_ptr<facebook::react::CallInvoker> _jsCallInvoker;
    void *_runtime;
}

#pragma mark - Singleton

static RCTBridge *_RNWCurrentBridge = nil;

+ (RCTBridge *)currentBridge {
    return _RNWCurrentBridge;
}

+ (void)_rnwSetCurrentBridge:(RCTBridge *)bridge {
    _RNWCurrentBridge = bridge;
}

#pragma mark - Runtime + CallInvoker

- (std::shared_ptr<facebook::react::CallInvoker>)jsCallInvoker {
    return _jsCallInvoker;
}

- (void *)runtime {
    return _runtime;
}

- (void)_rnwSetRuntime:(void *)runtime
         jsCallInvoker:(std::shared_ptr<facebook::react::CallInvoker>)invoker {
    _runtime = runtime;
    _jsCallInvoker = std::move(invoker);
}

#pragma mark - Module lookup

- (id)moduleForName:(NSString *)moduleName {
    return [self moduleForName:moduleName lazilyLoadIfNecessary:YES];
}

- (id)moduleForName:(NSString *)moduleName
       lazilyLoadIfNecessary:(BOOL)lazilyLoadIfNecessary {
    if (moduleName == nil) {
        return nil;
    }
    // Both branches delegate to the registry; `lazilyLoadIfNecessary=NO`
    // accepts the semantic drift since callers that pass NO are tearing down.
    return [RNWTurboModuleRegistry.shared objcInstanceForName:moduleName];
}

- (id)moduleForClass:(Class)moduleClass {
    if (moduleClass == Nil) {
        return nil;
    }
    if (![moduleClass respondsToSelector:@selector(moduleName)]) {
        return nil;
    }
    NSString *name = [moduleClass moduleName];
    return [self moduleForName:name];
}

@end

#pragma mark - C entrypoints

// For hand-rolled `+load` registration that hardcodes the upstream
// symbol — our `RCT_EXPORT_MODULE` talks to `RNWRegisterTurboModuleClass`.
extern "C" void RCTRegisterModule(Class moduleClass) {
    if (moduleClass == Nil) {
        return;
    }
    if (![moduleClass respondsToSelector:@selector(moduleName)]) {
        return;
    }
    NSString *name = [moduleClass moduleName];
    if (name == nil) {
        return;
    }
    RNWRegisterTurboModuleClass(name, moduleClass);
}

#pragma mark - RCTUtils

NSString *RCTJSONStringify(id jsonObject, NSError **error) {
    if (jsonObject == nil) {
        return nil;
    }
    NSData *data = [NSJSONSerialization dataWithJSONObject:jsonObject
                                                   options:0
                                                     error:error];
    if (data == nil) {
        return nil;
    }
    return [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
}

id RCTJSONParse(NSString *jsonString, NSError **error) {
    if (jsonString == nil) {
        return nil;
    }
    NSData *data = [jsonString dataUsingEncoding:NSUTF8StringEncoding];
    if (data == nil) {
        return nil;
    }
    return [NSJSONSerialization JSONObjectWithData:data
                                           options:NSJSONReadingAllowFragments
                                             error:error];
}

NSString *RCTGenerateRandomID(void) {
    return [[NSUUID UUID] UUIDString].lowercaseString;
}
