# Expo native integration smoke

This watchOS app exercises the shipped, optional `ReactNativeWatchOSExpo` pod
through the public `ReactNativeWatchOSHost`. Its JavaScript is an actual Metro
watchOS bundle importing `expo-modules-core`; the fixture contains no private
copy of the runtime adapter.

From the repository root, with Node, Ruby, CocoaPods, and Xcode on `PATH`:

```sh
RNW_EXPO_SIMULATOR_UDID=<watch-simulator-uuid> ./poc/expo-smoke/run.sh all
```

Omit the simulator variable to select a booted watch simulator. `build` performs
all native and Metro builds without launching; `run` launches the existing app.
Generated files, per-phase logs, and `result.json` are under
`build/poc/expo-smoke`. `RNW_EXPO_TIMEOUT_SECONDS` overrides the 60-second result
wait. A missing, incomplete, or negative result makes the workflow fail.

The primary host discovers its factory using the generated Info.plist key. It
loads the bundle three times through the same Swift host object, recreating
Hermes and the Expo binding on each reload. A companion host uses an explicit
factory and remains alive across both reloads. The proof checks native module
lookup, synchronous argument validation, records, enums, shared objects,
promises, rejection, events, listener removal, isolated module state and event
subscriptions, and teardown while native work is pending. All four unique native
module instances must report exactly one creation and one destruction.

The project generator creates a local module package with real watchOS Expo
metadata and a podspec. The production `use_watchos_expo_modules!` helper searches
that package with SDK 57 autolinking, validates its pod, and generates the provider
compiled into the app. `RNWExpoModulesProof.swift` is a test module only; it is not
included in the production native pods.

The simultaneous-runtime assertions cover direct Expo JSI modules. Existing
bridge-style React Native modules use process-global bridge state and are outside
this isolation proof.
