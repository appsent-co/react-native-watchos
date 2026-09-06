# Expo 57 modules on watchOS

This experiment attaches Expo's real native Module DSL and JSI installer to the
watch Hermes runtime. Expo is installed from npm; there is no Expo repository
fork and no modification of `node_modules`. The experiment does maintain a
version-pinned source port outside Expo. Updating it requires reviewing
the generated source changes and rerunning the native checks.

## Why upgrade first

The repository and example now use Expo 57.0.20, React Native 0.86.3,
React 19.2.3, and react-reconciler 0.33.0. Expo 57.0.20 was the current stable
release when checked on September 4, 2026; SDK 58 was still a canary.

SDK 57 separates `expo-modules-jsi` and exposes a raw-runtime/scheduler attachment
API. That gives this custom host a useful integration boundary. It does not
make stock Expo Modules Core support watchOS: its podspec, React/Fabric paths,
native view APIs, and autolinker still assume Expo's supported Apple platforms.

Sources: [SDK 57 release notes](https://expo.dev/changelog/sdk-57),
[additional platform support](https://docs.expo.dev/modules/additional-platform-support/),
[AppContext](https://github.com/expo/expo/blob/sdk-57/packages/expo-modules-core/ios/Core/AppContext.swift),
[Expo JSI scheduler](https://github.com/expo/expo/blob/sdk-57/packages/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h).

## Experiment layout

| Part                | Purpose                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `expo-modules-jsi`  | Builds the authentic 57.0.8 Swift/C++ sources with watchOS build settings.                      |
| `expo-modules-core` | Selects the 57.0.16 non-UI source closure and applies checked adaptations for the custom host.  |
| `expo-smoke`        | Builds a minimal watch app and exercises an ordinary Swift Expo module in real Hermes runtimes. |

The local CocoaPods identities are `RNWExpoModulesJSI` and
`RNWExpoModulesCore`; their import names remain `ExpoModulesJSI` and
`ExpoModulesCore`. They are scoped to the experimental watch target. The
companion iOS application continues using the normal Expo packages.

The Core overlay keeps the genuine `Module`, `Function`, `AsyncFunction`,
`Events`, `OnCreate`, `OnDestroy`, converters, and runtime installer. It excludes
native views, Fabric, React bridge setup, app delegate integration, worklets,
and optimized function macros. These packages are not yet general-purpose Expo
module autolinking support: an individual module still needs watch-compatible
native APIs and build configuration.

## Run

Use Node 22.13+ (Node 24 was used for validation), CocoaPods, and an Xcode
toolchain with Swift 6.3. The experiment targets watchOS 9.4+ because the Swift/C++
interop layer requires it; the core watch renderer retains its watchOS 9.0
minimum. Boot a watch simulator, then run from the repository root:

```sh
npx pnpm@10.10.0 install
./poc/expo-smoke/run.sh
```

The script builds the watch runtime, Expo overlays, and smoke app. It accepts
`build` and `run` separately. Set
`RNW_EXPO_SIMULATOR_UDID` to select a specific watch simulator and `NODE_BINARY`
if Node is not correctly configured on `PATH`. Ruby and `pod` must also resolve
to a working CocoaPods installation.

Outputs, generated sources, Xcode projects, and logs are ignored build
artifacts. The final machine-readable result is
`build/poc/expo-smoke/result.json`. The workflow removes stale results before
launch and exits unsuccessfully for missing, failing, or invalid results.

## Runtime boundary

`RNWHermesHost` accepts an optional `RNWRuntimeBinding`. It installs the binding
on its JS queue before evaluating application code, then invalidates it on the
same queue before destroying Hermes. The host itself has no Expo dependency.

The smoke adapter registers the Swift provider and supplies Expo with its raw
runtime plus a scheduler. The scheduler owns only the host's invalidatable
queue state. The adopted Expo runtime retains that scheduler for as long as any
async wrapper can use it; it does not retain the watch host. Teardown releases
Expo's JS objects while Hermes is alive, invalidates future queue callbacks,
and lets Expo's authentic native-state finalizer release the context.

The smoke assertions cover genuine native module identity, sync calls and
argument validation, async resolution/rejection, event payloads, listener
removal, and exactly one create/destroy pair across each of three runtimes.
A slow native operation is left pending during teardown to check that a late
Promise cannot enter a destroyed runtime.

## Validation

Validated on September 4, 2026 with Xcode 26.6, Swift 6.3.3, and an Apple Watch
simulator running watchOS 26.4:

- Expo Doctor: 21/21 checks pass. Repository tests: 21/21 pass, including real
  React 19.2/reconciler mounting and updates, and Expo Metro watchOS resolution.
  TypeScript and ESLint pass.
- The upgraded example's complete Release watch/iPhone simulator build passes.
  Production and development watch bundles build; production bytecode uses
  Hermes bytecode version 98, matching the upgraded native engine.
- The actual Expo smoke app passes 27 JavaScript assertions across three
  independently created Hermes runtimes. Its native counters report exactly
  three creates and three destroys, including teardown with async work pending.
  Queue checks also accept the owning JS queue and reject the main queue.
- The complete PoC app compiles and links for both watch device architectures,
  `arm64` and `arm64_32`, with Hermes and Expo JSI embedded. These are unsigned
  device builds; runtime execution was verified on the simulator.

The generated runtime report is `build/poc/expo-smoke/result.json`. Terra agents
independently reviewed the upgrade, queue ownership and teardown, source
adaptations, and device builds. The complete scripted build/run workflow passed;
a Terra agent then independently reinstalled and reran the simulator fixture,
confirming all 27 assertions and the three create/destroy pairs again.

This is a non-UI PoC, not a promise that arbitrary Expo packages work unchanged.
Native module code that independently retains raw JSI values across runtime
teardown still needs an explicit lifetime policy. Stock Expo autolinking and
UI support remain separate work.
