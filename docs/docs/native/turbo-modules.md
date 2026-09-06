---
title: TurboModules
sidebar_position: 1
---

# TurboModules

Create native modules in Swift or Obj-C++ and call them from JS with
full codegen support. `@appsent-co/react-native-watchos` ships with a
[`RNWTurboModuleRegistry`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWTurboModuleRegistry.mm)
that's compatible with the standard React Native module spec generator.

## What works

- Sync and async methods.
- Promise-returning methods.
- Event emitters via
  [`RNWRCTEventEmitter`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWRCTEventEmitter.mm).
- Codegen-driven specs: the bundled WatchConnectivity module and the
  example app's WatchInfo module are working examples.

## A minimal module

The example app's `NativeWatchInfo` exposes two methods on
`WKInterfaceDevice`. The following files are relative to `example/`;
the module belongs to the app and compiles into its watch target.

### 1. The spec

A TurboModule spec is a TypeScript file whose name starts with `Native`,
in the directory `codegenConfig.jsSrcsDir` points at:

```ts
// src/specs/NativeWatchInfo.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getModelName: () => string;
  getSystemName: () => string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('WatchInfo');
```

The app's `package.json` contains:

```json
{
  "codegenConfig": {
    "name": "WatchAppSpecs",
    "type": "modules",
    "jsSrcsDir": "src/specs",
    "outputDir": {
      "ios": "ios/build/generated/watchos-codegen"
    }
  }
}
```

Every `Native*.ts` in `jsSrcsDir` is combined into one codegen library,
with an umbrella header and a protocol per spec. Here, `WatchAppSpecs.h`
declares `NativeWatchInfoSpec` and `NativeWatchInfoSpecJSI`.
The `withWatchTurboModuleCodegen` config plugin generates the code at
`expo prebuild` and adds its sources to the watch target.

### 2. The native class

```objc
// targets/watch/NativeWatchInfo.h
#pragma once
#import <Foundation/Foundation.h>
#import "WatchAppSpecs.h"

@interface NativeWatchInfo : NSObject <NativeWatchInfoSpec>
@end
```

```objc
// targets/watch/NativeWatchInfo.mm
#import "NativeWatchInfo.h"
#import <WatchKit/WatchKit.h>

@implementation NativeWatchInfo

RCT_EXPORT_MODULE(WatchInfo)

- (NSString *)getModelName
{
    return [[WKInterfaceDevice currentDevice] model];
}

- (NSString *)getSystemName
{
    return [[WKInterfaceDevice currentDevice] systemName];
}

- (std::shared_ptr<facebook::react::TurboModule>)
        getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeWatchInfoSpecJSI>(params);
}

@end
```

The watchOS `RCT_EXPORT_MODULE` macro registers the class with
`RNWTurboModuleRegistry`. The name must match the one passed to
`TurboModuleRegistry.getEnforcing()` in the spec. The generated
`NativeWatchInfoSpecJSI` supplies the JSI method bindings.

### 3. Call it from JavaScript

Import the spec from your app's code:

```ts
import WatchInfo from './specs/NativeWatchInfo';

const model = WatchInfo.getModelName();
const system = WatchInfo.getSystemName();
```

### 4. Regenerate

After adding, changing or removing a spec, run `expo prebuild -p ios`
before building so the generated headers and native sources match it.

## Modules distributed as packages

A reusable module declares its own `codegenConfig` and a podspec that
opts into watchOS. The bundled
[`RNWatchConnectivity.podspec`](https://github.com/appsent-co/react-native-watchos/blob/main/RNWatchConnectivity.podspec)
shows this setup:

```ruby
s.platforms = { :ios => '15.0', :watchos => '9.0' }
s.source_files = [
  'apple/Sources/WatchConnectivity/RNWWatchConnectivity.mm',
  'apple/Sources/WatchConnectivity/RNWWatchConnectivity.h',
]
s.frameworks = 'WatchConnectivity'
```

The `:watchos` platform enables discovery by `use_watchos_modules!`.
The `:ios` entry also makes the module available to the phone app.
Scope iOS dependencies such as `React-Core` and `ReactCodegen` with
`s.ios.dependency`. The watch slice depends on `ReactNativeWatchOSCxx`
and includes its generated spec directory through header search paths.

Each package has one codegen library containing its specs. On iOS,
React Native generates it during `pod install`. On watchOS, the config
plugin writes dependency libraries under
`ios/build/generated/watchos-codegen-libs/<name>/` during `expo prebuild`.
See [Watch Connectivity](../watch-connectivity) for a module that combines
promise methods and events.
