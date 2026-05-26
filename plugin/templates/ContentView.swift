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
// Requires `NSMotionUsageDescription` in this target's Info.plist.

import SwiftUI
import ReactNativeWatchOS

struct ContentView: View {
    // 127.0.0.1 works from the watchOS Simulator (shares the host's loopback).
    // For real-device testing, pass the Mac's LAN IP:
    //   ReactNativeWatchOSHost.defaultBundleURL(host: "192.168.1.42")
    // pnpm/monorepo setups serve bundles under `/<package>/index.bundle`:
    //   ReactNativeWatchOSHost.defaultBundleURL(entry: "my-app/index.watchos")
    private let bundleURL = ReactNativeWatchOSHost.defaultBundleURL()

    var body: some View {
        ReactNativeWatchOSView(bundleURL: bundleURL)
    }
}
