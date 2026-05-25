#pragma once

#import <Foundation/Foundation.h>
// `<React/RCTEventEmitter.h>` resolves to RN's pod on iOS and to our
// watchOS fork (`apple/Sources/ReactNativeWatchOSCxx/include/React/RCTEventEmitter.h`,
// shipped in the xcframework) on watch. Same import, same superclass
// name, same maintainer-facing API on both — implementation differs
// under the hood.
#import <React/RCTEventEmitter.h>

// Codegen-emitted umbrella for this package's spec. On iOS it's produced
// by standard RN codegen at `pod install` (driven by this package's
// `codegenConfig`). On watchOS it's produced by
// `withWatchTurboModuleCodegen`, which scans library specs from
// `node_modules/@appsent-co/react-native-watchos/src/watchConnectivity/specs/`.
#import "RNWatchConnectivitySpec.h"

NS_ASSUME_NONNULL_BEGIN

@interface RNWWatchConnectivity : RCTEventEmitter <NativeWatchConnectivitySpec>
@end

NS_ASSUME_NONNULL_END
