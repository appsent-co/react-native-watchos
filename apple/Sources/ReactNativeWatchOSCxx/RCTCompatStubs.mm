// Linker-side stubs paired with the header forks under `include/React/`
// and `include/cxxreact/`. Upstream `ReactCommon/RCTTurboModule.mm`
// references these symbols but the call sites are guarded by checks
// that always short-circuit on this slice — see each header for the
// guard.

#import <React/RCTConvert.h>
#import <React/RCTCxxConvert.h>
#import <React/RCTManagedPointer.h>
#import <React/RCTModuleMethod.h>
#import <React/RCTUtils.h>

#import <Foundation/Foundation.h>

#pragma mark - Empty classes

@implementation RCTConvert
@end

@implementation RCTCxxConvert
@end

@implementation RCTManagedPointer {
    void *_voidPointer;
}
- (void *)voidPointer {
    return _voidPointer;
}
@end

#pragma mark - C entrypoints

// Schema mirrors RN's promise-rejection dict — JS side walks these
// onto the Error instance via `Error.cause`.
NSDictionary<NSString *, id> *RCTJSErrorFromCodeMessageAndNSError(
    NSString *code, NSString *message, NSError *error) {
    NSString *errorMessage;
    NSArray<NSString *> *stackTrace = [NSThread callStackSymbols];
    NSMutableDictionary *errorInfo =
        [NSMutableDictionary dictionaryWithObject:stackTrace
                                           forKey:@"nativeStackIOS"];

    if (error) {
        errorMessage = error.localizedDescription ?: @"Unknown error from a native module";
        errorInfo[@"domain"] = error.domain ?: @"RNWErrorDomain";
        if (error.userInfo) {
            NSMutableDictionary<NSString *, id> *userInfo =
                [[NSMutableDictionary alloc] initWithCapacity:error.userInfo.count];
            [error.userInfo enumerateKeysAndObjectsUsingBlock:^(NSString *key, id obj, BOOL *stop) {
                if ([NSJSONSerialization isValidJSONObject:@{key : obj}]) {
                    userInfo[key] = obj;
                } else {
                    userInfo[key] = [obj description];
                }
            }];
            errorInfo[@"userInfo"] = userInfo;
        }
    } else {
        errorMessage = @"Unknown error from a native module";
        errorInfo[@"domain"] = @"RNWErrorDomain";
    }
    errorInfo[@"code"] = code ?: @"EUNSPECIFIED";
    errorInfo[@"userInfo"] = errorInfo[@"userInfo"] ?: [NSNull null];
    errorMessage = message ?: errorMessage;
    errorInfo[@"message"] = errorMessage;

    return errorInfo;
}
