---
title: Expo Modules
sidebar_position: 2
---

# Expo Modules on watchOS

Expo Modules are enabled automatically when Expo is installed. Watch-capable modules
can use the Swift Module DSL, functions, promises, events, records, enums, and shared
objects. A dedicated JavaScript thread lets Expo's JSI runtime compile unchanged;
small build patches exclude React UI dependencies from Core.

## Requirements

| Component | Version |
| --- | --- |
| Expo | 57.0.19–57.0.20 |
| React Native / React | 0.86.3 / 19.2.3 |
| watchOS | 9.4 or later |
| Xcode | 26.6 (Swift 6.3) |
| Native build inputs | Expo Core 57.0.16, JSI 57.0.8, Hermes `hermes-v250829098.0.17` |

The Expo peer dependency defines the supported app range. `expo-modules/versions.json`
pins the sources used to build the native runtime. Apps receive the prepared Core
sources and native frameworks; their installed Expo packages are never patched.

## Setup

Register the plugin after `@bacons/apple-targets` and run `npx expo prebuild -p ios`:

```json
{
  "expo": {
    "plugins": [
      "@bacons/apple-targets",
      ["@appsent-co/react-native-watchos", { "targetName": "watch" }]
    ]
  }
}
```

Prebuild discovers watch-capable modules, generates their Swift provider, wires the
pods, and configures a fresh Expo binding for each host and reload. This also works
with an empty provider. Set `expoModules: false` to disable the integration.

Expo integration requires the plugin-managed `targets/watch/pods.rb`. If you have
customized this generated file, keep a copy of your changes and let prebuild
regenerate it before applying the custom pod declarations again.

## Add a module

The repository's [local example module](https://github.com/appsent-co/react-native-watchos/tree/main/example/modules/expo-example)
shows the complete setup. Local modules live in an app's `modules/` directory and
are discovered automatically. Installed packages use the same metadata.

Declare watchOS separately from Expo's Apple platform:

```json
{
  "platforms": ["apple", "watchos"],
  "apple": { "modules": ["ExampleExpoModule"] },
  "watchos": {
    "modules": ["ExampleExpoModule"],
    "podspecPath": "ExampleExpo.podspec",
    "swiftModuleName": "ExampleExpo"
  }
}
```

`watchos.modules` contains public Swift class names. `swiftModuleName` matches the
pod's Swift module, and `podspecPath` is relative to the module package.

Scope the Core dependency to each platform in the module's podspec:

```ruby
s.platforms = { :ios => '16.4', :watchos => '9.4' }
s.ios.dependency 'ExpoModulesCore'
s.watchos.dependency 'RNWExpoModulesCore', '57.0.16'
```

Both Core pods expose `import ExpoModulesCore` to Swift. JavaScript accesses the
module through the standard API:

```ts
import { requireNativeModule } from 'expo-modules-core';

const example = requireNativeModule<{ hello(): string }>('ExampleExpoModule');
example.hello();
```

Use `withWatchosMetro` around Expo's Metro config as described in
[installation](../getting-started/installation.md); it selects the non-UI JavaScript
entry on watchOS.

## Legacy services

The watch build includes per-runtime legacy registry lookup, file-system helpers,
permission-requester plumbing, `Promise.legacyResolver` / `legacyRejecter`, and
persistent file logging. Each host owns its registry until teardown.

Native modules can register internal services with
`appContext.legacyModuleRegistry?.register(service)` and call `initialize()` to
inject the registry into `EXModuleRegistryConsumer` services. Register permission
requesters with `appContext.permissions?.register(requesters)`. Do this during
module creation, before concurrent work uses the services.

Native views, Fabric, React bridge APIs, app-delegate hooks, worklets, optimized
function macros, global legacy module discovery, and the old JavaScript export
proxy are outside the supported surface. Module implementations must use APIs
available on watchOS.

## Development

From the repository root:

```sh
pnpm build:xcframework
pnpm build:expo-modules
pnpm --dir example exec expo prebuild -p ios --no-install
(cd example/ios && pod install)
```

Run the `watch` scheme from `example/ios/watchosexample.xcworkspace` and open
**Demos → Expo Modules**. Native CI builds the example for iPhone, watch simulator,
and both watch device architectures. `pnpm test` covers the integration's focused
unit tests. `pnpm verify:package` checks the generated release artifacts.

See the repository's `expo-modules/README.md` for patch preparation and native build
inputs. Rebuild those artifacts after changing the native sources or ABI baseline.
