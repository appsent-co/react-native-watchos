// watchOS stub of `<React/RCTBridge.h>`. Just enough surface for
// bridge-style "JSI installer" modules (op-sqlite, mmkv-pre-3.x,
// reanimated-pre-2.x) to compile and link unmodified — module lookup
// is delegated to `RNWTurboModuleRegistry`. Runtime + CallInvoker
// live in `<React/RCTBridge+Private.h>` (kept separate so plain-ObjC
// includers don't pull in `<ReactCommon/CallInvoker.h>`).

#pragma once

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTBridge : NSObject

/// Process singleton wired up by `RNWHermesHost`. Nil before the first
/// host finishes initializing.
@property (class, nonatomic, readonly, nullable) RCTBridge *currentBridge;

/// Lazy lookup keyed by `RCT_EXPORT_MODULE(name)`. Sets the `bridge`
/// property on first materialization; caches for the bridge's lifetime.
- (nullable id)moduleForName:(NSString *)moduleName;

- (nullable id)moduleForName:(NSString *)moduleName
       lazilyLoadIfNecessary:(BOOL)lazilyLoadIfNecessary;

- (nullable id)moduleForClass:(Class)moduleClass;

@end

NS_ASSUME_NONNULL_END
