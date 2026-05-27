#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Per-host TurboModule registry, looked up by `__turboModuleProxy('<name>')`.
/// Modules self-register via `RCT_EXPORT_MODULE` (ObjC) or
/// `RNW_EXPORT_CXX_MODULE` (C++ — see `RNWTurboModuleRegistry+Cxx.h`).
@interface RNWTurboModuleRegistry : NSObject

@property (class, readonly) RNWTurboModuleRegistry *shared;

/// Factory runs lazily on first JS access; must return an instance
/// conforming to `<RCTBridgeModule, RCTTurboModule>`.
- (void)registerModuleName:(NSString *)name
                   factory:(id _Nonnull (^)(void))factory;

/// Materialize (or return cached) ObjC instance. Shared with
/// `RCTBridge -moduleForName:` so each module is instantiated at most
/// once per process.
- (nullable id)objcInstanceForName:(NSString *)name;

@end

NS_ASSUME_NONNULL_END
