#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Per-host registry of TurboModule factories, looked up by
/// `__turboModuleProxy('<name>')`. Modules normally self-register on image
/// load via `RCT_EXPORT_MODULE` (ObjC) or `RNW_EXPORT_CXX_MODULE` (C++);
/// direct calls here are for dynamic registration only.
///
/// ObjC modules: use `registerModuleName:factory:` (this header).
/// C++ modules: use `RNWTurboModuleRegistry+Cxx.h` from a `.mm` file.
@interface RNWTurboModuleRegistry : NSObject

@property (class, readonly) RNWTurboModuleRegistry *shared;

/// Factory is invoked lazily on first JS access and must return an
/// instance conforming to `<RCTBridgeModule, RCTTurboModule>`. The
/// instance's `-getTurboModule:` constructs the C++ wrapper.
- (void)registerModuleName:(NSString *)name
                   factory:(id _Nonnull (^)(void))factory;

@end

NS_ASSUME_NONNULL_END
