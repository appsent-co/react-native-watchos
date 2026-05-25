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
    // pnpm workspace: Expo serves bundles under `/<package>/index.bundle`,
    // not `/index.bundle`. For non-monorepo apps drop the `example/` prefix
    // (or just omit the `entry:` arg).
    //
    // 127.0.0.1 works from the watchOS Simulator (shares the host's loopback).
    // For real-device testing, pass the Mac's LAN IP:
    //   ReactNativeWatchOSHost.defaultBundleURL(entry: "example/index", host: "192.168.1.42")
    private let bundleURL = ReactNativeWatchOSHost.defaultBundleURL(entry: "example/index")

    var body: some View {
        // TurboModules auto-register on image load via `RCT_EXPORT_MODULE`
        // / `RNW_EXPORT_CXX_MODULE` — no explicit Swift provider list.
        // NativeMath (pure-C++) and NativeWatchInfo (ObjC + codegen)
        // declare themselves in their `.mm` files and the host picks
        // them up the first time JS calls `__turboModuleProxy('<name>')`.
        ReactNativeWatchOSView(bundleURL: bundleURL)
    }
}
