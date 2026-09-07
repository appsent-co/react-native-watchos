---
title: Expo Modules
sidebar_position: 2
---

# Expo Modules on watchOS

The optional Expo Modules runtime lets a watch target use the public non-UI
API from `expo-modules-core` without forking Expo. It uses an explicit,
maintained source port of Expo Modules Core and Expo Modules JSI. The port
lives outside `node_modules`, is version- and source-fingerprint-checked, and
ships as a regular package artifact.

The config plugin enables the runtime automatically when Expo is installed.
Native modules must explicitly support watchOS to be registered.

## Supported release matrix

| Component         | Required version                |
| ----------------- | ------------------------------- |
| Expo              | 57.0.20                         |
| Expo Modules Core | 57.0.16                         |
| Expo Modules JSI  | 57.0.8                          |
| React Native      | 0.86.3                          |
| React             | 19.2.3                          |
| Hermes            | `hermes-v250829098.0.17`        |
| watchOS           | 9.4 or later                    |
| Build toolchain   | Xcode 26.6 (Swift 6.3 compiler) |

The generator rejects a mismatched dependency or a modified upstream Core
source tree before it writes an overlay. It also records the input fingerprint,
transform output hashes, and copied Expo license in the shipped
`overlay-manifest.json`.

## Enable the config plugin

Add the watch target plugin after `@bacons/apple-targets`:

```json
{
  "expo": {
    "plugins": [
      "@bacons/apple-targets",
      [
        "@appsent-co/react-native-watchos",
        {
          "targetName": "watch"
        }
      ]
    ]
  }
}
```

Then regenerate native files:

```sh
npx expo prebuild -p ios
```

When `expoModules` is omitted, the plugin checks whether `expo/package.json`
resolves from the app root, including hoisted dependencies. Installed Expo enables
the integration even when there are no watch-capable modules; the generated
provider is then empty. Set `expoModules: false` to disable the integration, or
`true` to require it explicitly. The supported release matrix is checked whenever
the integration is enabled.

The plugin raises the watch deployment target to 9.4 when necessary, discovers
watch-capable Expo modules, generates `RNWExpoModulesProvider.swift`, adds that
Swift file to the watch target, and writes `RNWRuntimeBindingFactory` to the watch target's
`Info.plist`. The host reads that factory to create a fresh Expo runtime binding
for every Hermes host and reload.

The generated provider only accepts packages that explicitly declare watchOS
support. A hand-managed `targets/<watch>/pods.rb` intentionally causes a
plugin error while the integration is enabled, because the provider, Podfile,
and Info.plist factory must agree. Set `expoModules: false` and use the manual
integration below for that case.

## Author a watch-capable Expo module

A package must advertise watchOS separately from Expo's Apple support. For a
module named `FooModule`, add `expo-module.config.json`:

```json
{
  "platforms": ["apple", "watchos"],
  "apple": { "modules": ["FooModule"] },
  "watchos": {
    "modules": ["FooModule"],
    "podspecPath": "FooModule.podspec",
    "swiftModuleName": "FooModule"
  }
}
```

`watchos.modules` lists public Swift module classes. `swiftModuleName` must
match the CocoaPods `module_name`, and `podspecPath` must stay within the npm
package. The generated provider imports that Swift module and registers each
listed class.

The module can use Expo's normal non-UI DSL:

```swift
import ExpoModulesCore

public final class FooModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FooModule")

    Function("double") { (value: Int) in
      value * 2
    }

    AsyncFunction("loadValue") { () -> String in
      "ready"
    }

    Events("changed")
  }
}
```

Keep the class public and ensure the class name in `watchos.modules` is exactly
`FooModule`.

### Scope the pod dependencies by platform

The watch target must use the watch port, while the iOS target continues to
use stock Expo pods. A minimal podspec is:

```ruby
Pod::Spec.new do |s|
  s.name = 'FooModule'
  s.module_name = 'FooModule'
  s.version = '1.0.0'
  s.platforms = { :ios => '16.4', :watchos => '9.4' }
  s.source_files = 'apple/**/*.{swift,h,m,mm}'

  s.ios.dependency 'ExpoModulesCore'
  s.watchos.dependency 'RNWExpoModulesCore', '57.0.16'
end
```

`RNWExpoModulesCore` is a separate CocoaPods name from iOS
`ExpoModulesCore`, even though both expose the Swift module named
`ExpoModulesCore`. Do not add stock `ExpoModulesCore`, `ExpoModulesJSI`, React
bridge, or Fabric dependencies to the watchOS slice. Keep those dependencies
inside `s.ios` where needed.

## Manual Podfile integration

For a deliberately hand-managed watch `pods.rb`, set `expoModules: false` in
the config plugin. After prebuild and before `pod install`, generate the provider,
add it as a Swift source in the watch target, and configure the factory explicitly.
Repeat these steps after each prebuild, which removes plugin-managed Expo files
and the factory setting when the option is disabled:

```sh
node node_modules/@appsent-co/react-native-watchos/expo-modules/autolinking.cjs \
  --project-root . \
  --provider ios/build/generated/rnw-expo/watch/RNWExpoModulesProvider.swift
```

Inside the watch target's Podfile block, require the shipped helper and call
it with the same provider path:

```ruby
require_relative '../node_modules/@appsent-co/react-native-watchos/cocoapods/autolink'

use_watchos_modules!(
  :config_command => [
    'node', '--no-warnings', '--eval', "require('expo/bin/autolinking')",
    'expo-modules-autolinking', 'react-native-config', '--json', '--platform', 'ios'
  ],
  :expo_modules => true,
  :project_root => File.expand_path('..', __dir__),
  :expo_provider => File.expand_path(
    '../ios/build/generated/rnw-expo/watch/RNWExpoModulesProvider.swift',
    __dir__
  )
)
```

Add the generated `RNWExpoModulesProvider.swift` to the watch target's Compile
Sources phase. Set this `Info.plist` entry in the same target:

```xml
<key>RNWRuntimeBindingFactory</key>
<string>RNWExpoRuntimeBindingFactory</string>
```

The factory and provider are required for initial installation and for reloads.
Regenerate the provider whenever module dependencies or their
`expo-module.config.json` files change.

## Development and validation

Maintainers generate the native artifacts before prebuild:

```sh
pnpm build:xcframework
pnpm build:expo-modules
npx expo prebuild -p ios
```

Consumers of the published package do not build the port: the npm tarball
contains the generated Core closure and Expo Modules JSI XCFramework. The
source port is maintained in this repository rather than copied into an app's
`node_modules`.

The supported non-UI surface includes module lookup through
`import { requireNativeModule } from 'expo-modules-core'`, synchronous and
asynchronous functions, events, records, enums, and shared objects. The native
smoke fixture covers those paths, including runtime cleanup and simultaneous
direct Expo JSI module isolation. The release gate runs 63 JavaScript assertions
on the watch simulator, checks all four module instances are destroyed exactly
once, and compiles unsigned builds for both watch device architectures.
Physical-device runtime behavior has not yet been validated.

The port excludes native views, UIKit/AppKit integration, Fabric, the React
bridge, app-delegate hooks, worklets and UI runtimes, Expo’s React-driven reload hooks, and
optimized Expo function macros. A module that needs any of those APIs is not
supported on watchOS through this integration.

RNW host reloads are supported. Simultaneous-host checks apply to direct Expo
JSI modules; legacy React Native modules still share process-wide bridge state.

The release workflow also packs the npm artifact, installs it in a fresh Expo
app, checks automatic detection with an empty provider and opt-out/regeneration,
verifies the shipped artifact hashes, and builds the app with both stock iOS
Expo pods and the watch port.
Run the same gates locally with:

```sh
pnpm test:expo-modules
./poc/expo-smoke/run.sh device
node scripts/test-expo-consumer.cjs all
```

`npm pack` and publishing fail if native artifacts are missing, stale, or lack
one of the supported architectures. Regenerate both native builds after changing
the pinned release matrix or native source inputs.
