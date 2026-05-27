// watchOS stub of `<React/RCTModuleMethod.h>`. Dead-code parser fodder
// for upstream `RCTTurboModule.mm` — our `RCT_EXPORT_METHOD` doesn't
// emit the `__rct_export__*` sibling that `getArgumentTypeName` looks
// for, so the loop body never runs. `RCTParseMethodSignature` is a
// no-op that returns nil.

#pragma once

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef struct RCTMethodInfo {
    const char *const jsName;
    const char *const objcName;
    const BOOL isSync;
} RCTMethodInfo;

@interface RCTMethodArgument : NSObject

@property (nonatomic, copy, readonly) NSString *type;

@end

FOUNDATION_EXTERN NSString *_Nullable RCTParseMethodSignature(
    const char *input,
    NSArray<RCTMethodArgument *> *_Nullable *_Nullable arguments);

NS_ASSUME_NONNULL_END
