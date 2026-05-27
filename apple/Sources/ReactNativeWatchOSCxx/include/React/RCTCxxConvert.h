// watchOS stub of `<React/RCTCxxConvert.h>`. Upstream registers
// per-arg JS→C++-struct converters here; we never call the registration
// path, so `hasMethodArgConversionSelector(...)` always returns NO and
// the branch is dead. Class just has to exist for linking.

#pragma once

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTCxxConvert : NSObject
@end

NS_ASSUME_NONNULL_END
