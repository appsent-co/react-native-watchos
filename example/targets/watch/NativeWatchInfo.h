// Demo ObjC TurboModule. The `NativeWatchInfoSpec` protocol +
// `NativeWatchInfoSpecJSI` C++ class come from the codegen-emitted
// `WatchAppSpecs.h` — produced by `@react-native/codegen` at prebuild
// time from `example/src/specs/NativeWatchInfo.ts`. The
// `@appsent-co/react-native-watchos` Expo plugin wires the generated `.mm`/`.cpp`
// files into the watch target's `PBXSourcesBuildPhase` automatically.

#pragma once

#import <Foundation/Foundation.h>
// Codegen emits the umbrella header under `<libraryName>/<libraryName>.h`
// (see `codegenConfig.name` in package.json). That file declares the
// `NativeWatchInfoSpec` protocol + the `NativeWatchInfoSpecJSI` C++ class
// for every spec in `jsSrcsDir`.
#import "WatchAppSpecs.h"

NS_ASSUME_NONNULL_BEGIN

@interface NativeWatchInfo : NSObject <NativeWatchInfoSpec>
@end

NS_ASSUME_NONNULL_END
