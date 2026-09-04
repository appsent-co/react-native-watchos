#pragma once

#import <Foundation/Foundation.h>
// RN's header on iOS, the watchOS fork shipped in the xcframework on watch.
#import <React/RCTBridgeModule.h>
// Codegen umbrella for every `Native*.ts` under `src/specs/`.
#import "RNWatchConnectivitySpec.h"

NS_ASSUME_NONNULL_BEGIN

/// Keychain-backed string store for small secrets. JS facade:
/// `src/secureStorage/index.ts`; docs: docs/docs/secure-storage.md.
@interface RNWSecureStorage : NSObject <NativeSecureStorageSpec>
@end

NS_ASSUME_NONNULL_END
