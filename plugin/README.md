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

| Option                    | Default                         | Purpose                                                        |
| ------------------------- | ------------------------------- | -------------------------------------------------------------- |
| `targetName`              | `watch`                         | Name of the apple-targets watch target.                        |
| `bundleName`              | `main`                          | Release bundle filename without extension.                     |
| `entryFile`               | `index.watchos.{tsx,ts,jsx,js}` | JavaScript entry relative to the app.                          |
| `watchosDeploymentTarget` | `9.0`                           | CocoaPods deployment floor.                                    |
| `expoModules`             | `false`                         | Enable non-UI Expo Modules; raises the default floor to `9.4`. |

The plugin generates `targets/<name>/pods.rb`, registers watch-compatible native
pods, runs TurboModule codegen, and installs the Release bundle phase. It adds
Metro endpoint and local-networking keys to the watch Info.plist. Existing
hand-managed `pods.rb` files are preserved.

For non-UI Expo Modules, set `expoModules: true`. This also generates a Swift
provider, configures the runtime binding for initial load and reload, and rejects
unsupported package versions or watch module metadata. Packages must declare
watchOS support explicitly. See [the Expo Modules guide](../docs/docs/native/expo-modules.md)
for the exact supported SDK versions, module-author contract, and manual setup.

Published packages contain the native frameworks and Expo source closure;
consumers do not compile Hermes or generate the port. Repository contributors
run `pnpm build:xcframework` and `pnpm build:expo-modules` before prebuild.
