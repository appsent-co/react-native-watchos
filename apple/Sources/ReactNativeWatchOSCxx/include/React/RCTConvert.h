// watchOS stub of `<React/RCTConvert.h>`. Upstream uses this for
// JS→ObjC arg conversion (UIColor, NSURL, etc.) but that branch is
// dead code here: `getArgumentTypeName` only fires for `__rct_export__*`
// methods, which our `RCT_EXPORT_METHOD` doesn't emit. We just need
// the class to exist so the upstream `.mm` links.

#pragma once

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTConvert : NSObject
@end

NS_ASSUME_NONNULL_END
