---
title: TurboModules
sidebar_position: 1
---

# TurboModules

Create native modules in Swift or Obj-C++ and call them from JS with
full codegen support. `@appsent-co/react-native-watchos` ships with a
[`RNWTurboModuleRegistry`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWTurboModuleRegistry.mm)
that's compatible with the standard React Native module spec
generator.

## What works

- Sync and async methods.
- Promise-returning methods.
- Event emitters via
  [`RNWRCTEventEmitter`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWRCTEventEmitter.mm).
- Codegen-driven specs (the bundled `RNWatchConnectivity` and
  `RNWSecureStorage` modules are worked examples).

## A minimal module

The package's own `RNWSecureStorage` — three promise methods over the
Keychain, no events — is the smallest complete module and the walkthrough
below is exactly how it is wired. Every path is relative to the package
root; an app-local module follows the same steps with its own
`package.json` and target (the example app's `NativeWatchInfo` is one).

### 1. The spec

A TurboModule spec is a TypeScript file whose name starts with `Native`,
in the directory `codegenConfig.jsSrcsDir` points at:

```ts
// src/specs/NativeSecureStorage.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, base64: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RNWSecureStorage');
```

```json
// package.json
"codegenConfig": {
  "name": "RNWatchConnectivitySpec",
  "type": "modules",
  "jsSrcsDir": "src/specs"
}
```

One `codegenConfig` per package is all the schema allows, and one is all
you need: every `Native*.ts` in `jsSrcsDir` is combined into **one**
library, emitted as `<name>/<name>.h` + `<name>-generated.mm` with a
protocol per spec (`NativeSecureStorageSpec`,
`NativeWatchConnectivitySpec`, …). On iOS, React Native's codegen does this
at `pod install`; on watchOS the config plugin's
`withWatchTurboModuleCodegen` does the same at `expo prebuild` and writes
the output under `ios/build/generated/watchos-codegen-libs/<name>/`.

Byte payloads travel as base64 strings — codegen has no byte-array type.

### 2. The native class

```objc
// apple/Sources/SecureStorage/RNWSecureStorage.h
#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>      // RN's pod on iOS, the watch fork on watchOS
#import "RNWatchConnectivitySpec.h"     // the codegen umbrella from step 1

@interface RNWSecureStorage : NSObject <NativeSecureStorageSpec>
@end
```

```objc
// apple/Sources/SecureStorage/RNWSecureStorage.mm
#import "RNWSecureStorage.h"

@implementation RNWSecureStorage

RCT_EXPORT_MODULE(RNWSecureStorage)   // the JS name passed to getEnforcing()

+ (BOOL)requiresMainQueueSetup { return NO; }

- (void)getItem:(NSString *)key
        resolve:(RCTPromiseResolveBlock)resolve
         reject:(RCTPromiseRejectBlock)reject
{
    // ... SecItemCopyMatching; resolve([NSNull null]) when absent,
    // reject(@"keychain_error", message, nil) on any other OSStatus.
}

// setItem:base64:resolve:reject: and removeItem:resolve:reject: likewise.

- (std::shared_ptr<facebook::react::TurboModule>)
        getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeSecureStorageSpecJSI>(params);
}

@end
```

Two things make the same `.mm` compile on both platforms:

- `<React/RCTBridgeModule.h>` resolves to React Native's header on iOS
  and to the package's watchOS fork (shipped in the
  `ReactNativeWatchOSCxx` xcframework) on the watch. The fork's
  `RCT_EXPORT_MODULE` expands to a `+load` that registers the class with
  `RNWTurboModuleRegistry`, which is why the consuming target links with
  `-ObjC` (CocoaPods autolinking sets that).
- The generated `NativeSecureStorageSpecJSI` is what turns the ObjC
  promise methods into JSI calls. Promise blocks resolve on the JS queue
  and drain microtasks, so `await SecureStorage.getItem(...)` continues
  immediately.

Methods run on the module's native queue (one serial queue per module
manager), not on the JS queue — blocking work such as `SecItem*` is fine
there.

### 3. The podspec

Add the sources to the podspec that autolinking already picks up for the
package. Autolinking admits exactly one podspec per npm package on each
platform (`react-native.config.js` → `podspecPath` on the watch side,
the root podspec matching the package name on the Expo side), so a
second module goes into the existing one rather than a new file:

```ruby
# RNWatchConnectivity.podspec
s.platforms      = { :ios => '15.0', :watchos => '9.0' }   # :watchos is the opt-in
s.source_files   = [
  'apple/Sources/WatchConnectivity/RNWWatchConnectivity.mm',
  'apple/Sources/WatchConnectivity/RNWWatchConnectivity.h',
  'apple/Sources/SecureStorage/RNWSecureStorage.mm',
  'apple/Sources/SecureStorage/RNWSecureStorage.h',
]
s.frameworks     = 'WatchConnectivity', 'Security'
```

`:watchos` in `s.platforms` is what `use_watchos_modules!` keys on to
compile the pod into the watch target; the `:ios` entry keeps the module
in the phone app. The iOS-only dependencies (`React-Core`, `ReactCodegen`)
are scoped with `s.ios.dependency`; the watch slice depends on
`ReactNativeWatchOSCxx` instead and gets the codegen output directory on
its header search path (see the full podspec).

### 4. The JS facade

```ts
// src/secureStorage/index.ts
import NativeSecureStorage from '../specs/NativeSecureStorage';

export const SecureStorage = {
  async getItem(key: string): Promise<string | null> {
    return (await NativeSecureStorage.getItem(key)) ?? null;
  },
  setItem: (key: string, base64: string) => NativeSecureStorage.setItem(key, base64),
  removeItem: (key: string) => NativeSecureStorage.removeItem(key),
};
```

exported from `package.json` as
`"./secure-storage": "./src/secureStorage/index.ts"`.

### 5. Regenerate

Changing `jsSrcsDir` or adding a spec changes what both codegens scan, so
run `expo prebuild -p ios --clean` (which re-runs `pod install`) before
building. A stale `ios/` tree still carries the old umbrella header, and
the new `.mm` fails to compile against it.
