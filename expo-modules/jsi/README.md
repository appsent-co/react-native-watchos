# Expo Modules JSI watchOS port

This builds the authentic `expo-modules-jsi` 57.0.8 sources against the
React Native 0.86.3 / Hermes V1 watch runtime. It never modifies `node_modules`.
`upstream-files.json` pins every upstream input used by the build; a changed
version or source file fails before generation.

Two Swift adaptations replace React Native’s dedicated-thread assumptions
with RNW’s serial-queue identity. `JavaScriptRuntime` compares its exact runtime
pointer with the current RNW queue, and `JavaScriptActor` checks queue membership.
There is no pthread fallback. Calls from outside the owning queue must use the
host scheduler. Standalone Expo-owned runtimes are outside this port’s contract.

Run from the repository root:

```sh
pnpm build:xcframework
pnpm build:expo-modules
```

The build requires Xcode 26.6 and its Swift 6.3 compiler. The Expo pods require
watchOS 9.4; the base renderer can retain its watchOS 9.0 floor. Device slices
contain `arm64` and `arm64_32`; the simulator slice contains `arm64`.

Intermediates live in `build/expo-modules-jsi`. The finished framework is copied
as real files into `expo-modules/jsi/build/ExpoModulesJSI.xcframework` for npm
packaging. The pod is named `RNWExpoModulesJSI`; its framework and Swift module
are named `ExpoModulesJSI`. The package contains the upstream MIT license and
source provenance.

The port retains upstream’s dynamic framework and deferred JSI symbol lookup.
The watch host exports `RNWCurrentJavaScriptRuntime`, and the pod forces that
symbol to be retained. The native release gate exercises these links through
actual watch simulator execution and both unsigned device architectures.
