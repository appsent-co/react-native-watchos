#import "ReactNativeWatchOSCxx/RNWTurboModuleRegistry.h"
#import "ReactNativeWatchOSCxx/RNWTurboModuleRegistry+Cxx.h"
#import <ReactCommon/RCTTurboModule.h>
#import <React/RCTBridgeModule.h>

#include <ReactCommon/CallInvoker.h>
#include <ReactCommon/TurboModule.h>

#include <memory>
#include <string>
#include <unordered_map>

@implementation RNWTurboModuleRegistry {
    std::unordered_map<std::string, RNWTurboModuleCxxFactory> _cxxFactories;
    // Cached so one module name → one instance per host lifetime
    // (TurboModuleBinding caches the JS side but not the C++ side).
    std::unordered_map<std::string,
                       std::shared_ptr<facebook::react::TurboModule>>
        _instances;
    NSMutableDictionary<NSString *, id _Nonnull (^)(void)> *_objcFactories;
}

+ (instancetype)shared {
    static RNWTurboModuleRegistry *instance;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[self alloc] init];
    });
    return instance;
}

- (instancetype)init {
    if ((self = [super init])) {
        _objcFactories = [NSMutableDictionary dictionary];
    }
    return self;
}

#pragma mark - ObjC registration

- (void)registerModuleName:(NSString *)name
                   factory:(id _Nonnull (^)(void))factory {
    if (name == nil || factory == nil) {
        return;
    }
    _objcFactories[name] = [factory copy];
}

#pragma mark - C++ registration

- (void)registerCxxModuleNamed:(NSString *)name
                       factory:(RNWTurboModuleCxxFactory)factory {
    if (name == nil || !factory) {
        return;
    }
    _cxxFactories[std::string([name UTF8String])] = std::move(factory);
}

#pragma mark - Lookup

- (std::shared_ptr<facebook::react::TurboModule>)
        lookupModuleNamed:(NSString *)name
                jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
            nativeInvoker:(std::shared_ptr<facebook::react::NativeMethodCallInvoker>)nativeInvoker {
    if (name == nil) {
        return nullptr;
    }
    std::string key([name UTF8String]);

    auto cached = _instances.find(key);
    if (cached != _instances.end()) {
        return cached->second;
    }

    // C++ factories take precedence.
    auto cxxFactory = _cxxFactories.find(key);
    if (cxxFactory != _cxxFactories.end()) {
        auto instance = cxxFactory->second(jsInvoker);
        if (instance) {
            _instances[key] = instance;
        }
        return instance;
    }

    id _Nonnull (^objcFactory)(void) = _objcFactories[name];
    if (objcFactory == nil) {
        return nullptr;
    }
    id instance = objcFactory();
    if (instance == nil) {
        return nullptr;
    }
    if (![instance conformsToProtocol:@protocol(RCTModuleProvider)]) {
        NSLog(@"[RNWTurboModuleRegistry] factory for '%@' returned an instance "
              @"that does not conform to <RCTModuleProvider> — cannot build "
              @"a TurboModule wrapper.", name);
        return nullptr;
    }
    facebook::react::ObjCTurboModule::InitParams params = {
        .moduleName = key,
        .instance = (id<RCTBridgeModule>)instance,
        .jsInvoker = std::move(jsInvoker),
        .nativeMethodCallInvoker = std::move(nativeInvoker),
        .isSyncModule = false,
        .shouldVoidMethodsExecuteSync = false,
    };
    auto module = [(id<RCTModuleProvider>)instance getTurboModule:params];
    if (module) {
        _instances[key] = module;
    }
    return module;
}

@end

#pragma mark - C entrypoints for RCT_EXPORT_MODULE / RNW_EXPORT_CXX_MODULE

// Invoked from `+load` synthesized by `RCT_EXPORT_MODULE`.
extern "C" void RNWRegisterTurboModuleClass(NSString *name, Class moduleClass) {
    if (name == nil || moduleClass == Nil) {
        return;
    }
    [RNWTurboModuleRegistry.shared registerModuleName:name
                                              factory:^id {
        return [[moduleClass alloc] init];
    }];
}

// Invoked from `+load` synthesized by `RNW_EXPORT_CXX_MODULE`.
extern "C" void RNWRegisterCxxTurboModule(NSString *name,
                                          RNWTurboModuleCxxFactory factory) {
    if (name == nil || !factory) {
        return;
    }
    [RNWTurboModuleRegistry.shared registerCxxModuleNamed:name
                                                  factory:std::move(factory)];
}
