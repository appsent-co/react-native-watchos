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
- Runs codegen for the package's WatchConnectivity spec (`src/specs/`) and for the app's own specs.
- Adds the Info.plist keys the runtime's DEBUG path reads to
  `targets/<name>/Info.plist` when they are missing (see
  [Dev-server endpoint](#dev-server-endpoint) below).

The plugin is registered automatically by `npx react-native-watchos init`
into your `app.json` *after* `@bacons/apple-targets`. The plugin name
in `app.json` is `@appsent-co/react-native-watchos`.

> TODO: document the plugin's options (deployment target, custom
> entry file, codegen overrides).

## Dev-server endpoint

`ReactNativeWatchOSHost.defaultBundleURL()` (what the template
`ContentView.swift` calls) fetches the DEBUG bundle from
`http://127.0.0.1:8081` — right for the watchOS Simulator, which shares
the Mac's loopback, and wrong as soon as Metro is on another port or the
watch is a physical device on your LAN. Rather than editing Swift, the
endpoint is an Info.plist value that expands from build settings.
`npx react-native-watchos init` writes these keys into
`targets/<name>/Info.plist`, and the config plugin re-adds any that are
missing on every `expo prebuild` (existing values are never touched):

| Key | Value written | Read by |
| --- | --- | --- |
| `RNWDevServerHost` | `$(RNW_DEV_SERVER_HOST)` | `defaultBundleURL()` (DEBUG only) |
| `RNWDevServerPort` | `$(RNW_DEV_SERVER_PORT)` | `defaultBundleURL()` (DEBUG only) |
| `NSAppTransportSecurity.NSAllowsLocalNetworking` | `true` | ATS — lets the plain-`http://` bundle fetch reach a LAN / `.local` host from a physical watch |
| `NSMotionUsageDescription` | a dev-menu string | the shake-to-reload gesture |

Unset build settings expand to the empty string, which the runtime treats
as "use the default", so nothing changes until you pass them:

```sh
# 8081 is held by another Metro on this Mac
npx expo start --port 8082
xcodebuild ... RNW_DEV_SERVER_PORT=8082

# physical Apple Watch: reach the Mac over the LAN
xcodebuild ... RNW_DEV_SERVER_HOST=192.168.1.42
```

The same two settings work from an `.xcconfig` or the scheme's build
settings in Xcode. `console.*` output from the watch is POSTed back to
whichever (host, port) the bundle was fetched from, so it lands in that
Metro's terminal. Explicit `host:` / `port:` arguments to
`defaultBundleURL` still take precedence over the plist, and Release
builds ignore all of this (they load the embedded `main.jsbundle`).
