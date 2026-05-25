---
title: Expo plugin
---

# Expo plugin

The config plugin in [`plugin/`](https://github.com/appsent-co/react-native-watchos/tree/main/plugin)
wires the Swift Package into your watch target and handles the
build-time glue:

- Adds the `ReactNativeWatchOS` Swift Package to the watch target.
- Runs autolinking so your TurboModules are registered.
- Lets you override the watchOS deployment target.
- Installs the Release bundle build phase
  (`expo export:embed --platform watchos`).
- Runs codegen for the `RNWatchConnectivity` spec.

The plugin is registered automatically by `npx react-native-watchos init`
into your `app.json` *after* `@bacons/apple-targets`. The plugin name
in `app.json` is `@appsent-co/react-native-watchos`.

> TODO: document the plugin's options (deployment target, custom
> entry file, codegen overrides).
