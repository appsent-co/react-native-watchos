// watchOS fork of `<React/RCTUtils.h>`. Only the helpers we can
// implement losslessly here — anything UIKit/bridge-flavored stays
// omitted rather than silently returning wrong values.

#pragma once

#import <Foundation/Foundation.h>
#import <React/RCTLog.h>

NS_ASSUME_NONNULL_BEGIN

RCT_EXTERN NSString *_Nullable RCTJSONStringify(id _Nullable jsonObject,
                                                NSError **error);

RCT_EXTERN id _Nullable RCTJSONParse(NSString *_Nullable jsonString,
                                     NSError **error);

RCT_EXTERN NSString *RCTGenerateRandomID(void);

/// Promise-rejection dict consumed by upstream `RCTTurboModule.mm`'s
/// promise dispatch path. Schema: `{ code, message, domain, userInfo,
/// nativeStackIOS }`.
RCT_EXTERN NSDictionary<NSString *, id> *RCTJSErrorFromCodeMessageAndNSError(
    NSString *_Nullable code,
    NSString *_Nullable message,
    NSError *_Nullable error);

NS_ASSUME_NONNULL_END
