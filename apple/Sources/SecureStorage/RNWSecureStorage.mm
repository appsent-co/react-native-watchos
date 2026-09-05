#import "RNWSecureStorage.h"

#import <Security/Security.h>

// Changing the service name orphans every stored value.
static NSString *const kRNWSecureStorageService =
    @"co.appsent.reactnativewatchos.securestorage";

// watchOS has no SecTask entitlement lookup. Require the app to supply the
// resolved signing access group rather than guess its App ID prefix. In
// particular, an omitted group on a query searches ALL accessible groups.
static NSMutableDictionary *RNWSecureStorageQuery(NSString *key,
                                                 RCTPromiseRejectBlock reject)
{
    id group = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"RNWSecureStorageAccessGroup"];
    if (![group isKindOfClass:[NSString class]] || [group length] == 0 ||
        [group containsString:@"$("] || [group containsString:@"${"] ||
        [group hasPrefix:@"."] ||
        ![group isEqualToString:[group stringByTrimmingCharactersInSet:
                                [NSCharacterSet whitespaceAndNewlineCharacterSet]]]) {
        reject(@"keychain_configuration_error",
               @"Set RNWSecureStorageAccessGroup in the app's Info.plist to its "
               @"existing Keychain access group. For a private app group use "
               @"$(AppIdentifierPrefix)$(PRODUCT_BUNDLE_IDENTIFIER), expanded by Xcode. "
               @"Existing apps with Keychain Sharing must select the original "
               @"default group to retain their values (docs/docs/secure-storage.md).",
               nil);
        return nil;
    }
    return [@{
        (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
        (__bridge id)kSecAttrService: kRNWSecureStorageService,
        (__bridge id)kSecAttrAccount: key,
        (__bridge id)kSecAttrAccessGroup: group,
        (__bridge id)kSecAttrSynchronizable: @NO,
    } mutableCopy];
}

static NSString *RNWSecureStorageStatusMessage(OSStatus status)
{
    NSString *text = nil;
    if (@available(iOS 11.3, watchOS 4.3, *)) {
        text = (__bridge_transfer NSString *)SecCopyErrorMessageString(status, NULL);
    }
    NSString *message = [NSString stringWithFormat:@"OSStatus %d%@", (int)status,
                         text.length > 0 ? [NSString stringWithFormat:@" (%@)", text] : @""];
    if (status == errSecMissingEntitlement) {
        message = [message stringByAppendingString:
                   @" — check the configured access group and signing entitlements. On the "
                   @"simulator the watch target needs an entitlements file: "
                   @"`\"entitlements\": {}` in targets/<name>/expo-target.config.json, "
                   @"then `expo prebuild` (docs/docs/secure-storage.md, \"Simulator "
                   @"builds need an entitlements file\")."];
    }
    return message;
}

@implementation RNWSecureStorage

RCT_EXPORT_MODULE(RNWSecureStorage)

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

#pragma mark - Spec methods

- (void)getItem:(NSString *)key
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
    NSMutableDictionary *query = RNWSecureStorageQuery(key, reject);
    if (query == nil) return;
    query[(__bridge id)kSecReturnData] = @YES;
    query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
    CFTypeRef result = NULL;
    OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
    if (status == errSecItemNotFound) {
        resolve([NSNull null]);
        return;
    }
    if (status != errSecSuccess) {
        reject(@"keychain_error", RNWSecureStorageStatusMessage(status), nil);
        return;
    }
    NSData *data = (__bridge_transfer NSData *)result;
    resolve([data base64EncodedStringWithOptions:0] ?: @"");
}

- (void)setItem:(NSString *)key
         base64:(NSString *)base64
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
    NSData *data = [[NSData alloc] initWithBase64EncodedString:base64 ?: @"" options:0];
    if (data == nil) {
        reject(@"invalid_base64", @"setItem value was not valid base64", nil);
        return;
    }
    NSMutableDictionary *query = RNWSecureStorageQuery(key, reject);
    if (query == nil) return;
    NSMutableDictionary *attributes = [query mutableCopy];
    attributes[(__bridge id)kSecValueData] = data;
    // Readable unattended after the first unlock following reboot, never restored
    // onto another device.
    attributes[(__bridge id)kSecAttrAccessible] =
        (__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
    OSStatus status = SecItemAdd((__bridge CFDictionaryRef)attributes, NULL);
    if (status == errSecDuplicateItem) {
        status = SecItemUpdate((__bridge CFDictionaryRef)query,
                               (__bridge CFDictionaryRef)@{
                                   (__bridge id)kSecValueData: data,
                               });
    }
    if (status != errSecSuccess) {
        reject(@"keychain_error", RNWSecureStorageStatusMessage(status), nil);
        return;
    }
    resolve([NSNull null]);
}

- (void)removeItem:(NSString *)key
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject
{
    NSMutableDictionary *query = RNWSecureStorageQuery(key, reject);
    if (query == nil) return;
    OSStatus status = SecItemDelete((__bridge CFDictionaryRef)query);
    if (status != errSecSuccess && status != errSecItemNotFound) {
        reject(@"keychain_error", RNWSecureStorageStatusMessage(status), nil);
        return;
    }
    resolve([NSNull null]);
}

#pragma mark - TurboModule wiring

- (std::shared_ptr<facebook::react::TurboModule>)
        getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeSecureStorageSpecJSI>(params);
}

@end
