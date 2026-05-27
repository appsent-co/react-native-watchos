// watchOS stub of `<React/RCTBridge+Private.h>`. `RCTCxxBridge` is a
// typedef to `RCTBridge` so the upstream
//   `auto rt = (facebook::jsi::Runtime *)((RCTCxxBridge *)_bridge).runtime;`
// cast compiles unchanged.

#pragma once

#import <React/RCTBridge.h>

#if defined(__cplusplus)

#include <ReactCommon/CallInvoker.h>
#include <memory>

NS_ASSUME_NONNULL_BEGIN

typedef RCTBridge RCTCxxBridge;

@interface RCTBridge (Private)

/// Set by `RNWHermesHost` after the runtime boots; nullptr before then.
@property (nonatomic, readonly) std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker;

/// Typed as `void *` to match upstream; callers cast to
/// `facebook::jsi::Runtime *`. NULL before the runtime boots.
@property (nonatomic, readonly, nullable) void *runtime;

@end

NS_ASSUME_NONNULL_END

#endif  // __cplusplus
