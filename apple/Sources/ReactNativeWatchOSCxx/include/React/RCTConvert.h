// watchOS stub of `<React/RCTConvert.h>`. Upstream provides typed
// JS→ObjC converters (`+NSString:`, `+UIColor:`, …). We ship the class
// as a no-op — the dispatcher's `respondsToSelector:` check fails for
// every type and falls through to the generic JSI→ObjC converter.

#pragma once

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTConvert : NSObject
@end

NS_ASSUME_NONNULL_END
