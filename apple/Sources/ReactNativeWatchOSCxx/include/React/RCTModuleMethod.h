// Pieces of upstream `<React/RCTModuleMethod.h>` that the interop
// dispatcher reads: the `RCTMethodInfo` stash struct, `RCTMethodArgument`
// (trimmed to `.type` — dispatch never reads nullability/unused), and
// `RCTParseMethodSignature`. Impl in `RCTModuleMethod.mm`.

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

- (instancetype)initWithType:(NSString *)type;

@end

FOUNDATION_EXTERN NSString *_Nullable RCTParseMethodSignature(
    const char *input,
    NSArray<RCTMethodArgument *> *_Nullable *_Nullable arguments);

NS_ASSUME_NONNULL_END
