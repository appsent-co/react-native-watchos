// swift-tools-version:5.9
//
// @appsent-co/react-native-watchos — local Swift Package consumed by the WatchApp target.
//
// Two binary targets:
//   - Hermes (dynamic framework) — the JS engine; embedded into the consumer
//     app by SPM.
//   - ReactNativeWatchOSCxx (static library + headers) — the ObjC++ host that
//     owns the jsi::Runtime and installs `console`.
//
// Run scripts/build-xcframework.sh from the repo root once before resolving
// this package so both XCFrameworks exist on disk under ../build/xcframework.

import PackageDescription

let package = Package(
    name: "ReactNativeWatchOS",
    platforms: [
        .iOS(.v15),
        .watchOS(.v9),
    ],
    products: [
        .library(
            name: "ReactNativeWatchOS",
            targets: ["ReactNativeWatchOS"]
        ),
    ],
    targets: [
        .binaryTarget(
            name: "Hermes",
            path: "../build/xcframework/Hermes.xcframework"
        ),
        .binaryTarget(
            name: "ReactNativeWatchOSCxx",
            path: "../build/xcframework/ReactNativeWatchOSCxx.xcframework"
        ),
        .target(
            name: "ReactNativeWatchOS",
            dependencies: ["ReactNativeWatchOSCxx", "Hermes"],
            path: "Sources/ReactNativeWatchOS",
            linkerSettings: [
                // ReactNativeWatchOSCxx is a static archive that includes JSI
                // (C++) — consumer must link libc++ explicitly. Swift target
                // alone wouldn't pull it in.
                .linkedLibrary("c++"),
            ]
        ),
    ]
)
