# React Native watchOS Expo plugin

This plugin connects the watch target created by `@bacons/apple-targets` to the
CocoaPods runtime, native module registration, Metro, and a Release JavaScript
bundle. It ships with `@appsent-co/react-native-watchos`.

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

Run `npx react-native-watchos init` to scaffold the watch entry and target, then
`npx expo prebuild -p ios` and build the watch scheme in Xcode. Use
`withWatchosMetro` from `@appsent-co/react-native-watchos/metro-config` around
Expo’s Metro configuration.

| Option                    | Default                             | Purpose                                             |
| ------------------------- | ----------------------------------- | --------------------------------------------------- |
| `targetName`              | `watch`                             | Name of the apple-targets watch target.             |
| `bundleName`              | `main`                              | Release bundle filename without extension.          |
| `entryFile`               | `index.watchos.{tsx,ts,jsx,js}`     | JavaScript entry relative to the app.               |
| `watchosDeploymentTarget` | `9.4` when enabled, otherwise `9.0` | CocoaPods deployment floor.                         |
| `expoModules`             | Detect installed `expo`             | Enable non-UI Expo Modules; set `false` to disable. |

The plugin generates `targets/<name>/pods.rb`, registers watch-compatible native
pods, runs TurboModule codegen, and installs the Release bundle phase. It adds
Metro endpoint and local-networking keys to the watch Info.plist. Existing
hand-managed `pods.rb` files are preserved with `expoModules: false`; Expo Modules
require the plugin-managed pod configuration.

Non-UI Expo Modules are enabled automatically when `expo` resolves from the app
root, even if the watch target has no Expo modules. Set `expoModules: false` to
disable this integration. Prebuild generates a Swift provider, configures the
runtime binding for initial load and reload, and rejects unsupported package
versions or watch module metadata. Packages must declare watchOS support
explicitly. See [the Expo Modules guide](../docs/docs/native/expo-modules.md)
for supported versions and module setup, or see the local module in `example/modules`.

Published packages contain the native frameworks and maintained Expo Core sources;
consumers do not compile Hermes or apply source patches. Supported app Expo patches
are listed separately from native build pins. Repository contributors
run `pnpm build:xcframework` and `pnpm build:expo-modules` before prebuild.
