// Drop this file into your `targets/watch/` directory alongside `index.swift`
// (created by `npx create-target watch`) to get a working POC out of the box.
//
// `defaultBundleURL` returns:
//   - DEBUG: the Metro dev URL (`npx expo start`). Metro picks up
//     `index.watchos.{ts,tsx}` for the `?platform=watchos` request
//     when `metro.config.js` wraps the default config with
//     `withWatchosMetro` from `@appsent-co/react-native-watchos/metro-config`.
//   - Release: a file:// URL to `main.jsbundle` written into the watch
//     `.app` by the Expo plugin's Run Script Build Phase.
//
// In DEBUG builds, shake the watch (~2.3g) to open the dev menu (reload).
// Requires `NSMotionUsageDescription` in this target's Info.plist — written
// by `npx react-native-watchos init` and re-checked on every `expo prebuild`
// by the config plugin, together with the dev-server keys below.

import SwiftUI
import ReactNativeWatchOS

struct ContentView: View {
    // 127.0.0.1:8081 works from the watchOS Simulator (shares the host's
    // loopback). To point a DEBUG build elsewhere, don't edit this file: the
    // config plugin writes `RNWDevServerHost` / `RNWDevServerPort` into
    // `targets/<name>/Info.plist` as `$(RNW_DEV_SERVER_HOST)` /
    // `$(RNW_DEV_SERVER_PORT)`, so pass them as build settings —
    //   xcodebuild ... RNW_DEV_SERVER_PORT=8082         (8081 already taken)
    //   xcodebuild ... RNW_DEV_SERVER_HOST=192.168.1.42 (physical watch)
    // — or set them in an xcconfig / the scheme's build settings. Explicit
    // arguments still win when you need them:
    //   ReactNativeWatchOSHost.defaultBundleURL(host: "192.168.1.42")
    // pnpm/monorepo setups serve bundles under `/<package>/index.bundle`:
    //   ReactNativeWatchOSHost.defaultBundleURL(entry: "my-app/index.watchos")
    private let bundleURL = ReactNativeWatchOSHost.defaultBundleURL()

    var body: some View {
        ReactNativeWatchOSView(bundleURL: bundleURL)
    }
}
