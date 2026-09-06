# RNW Expo Modules Core overlay

This is a reproducible, non-UI watchOS 9.4+ source overlay for the installed
Expo Modules Core 57.0.16 package. It deliberately retains Expo's real Swift
Module DSL and JSI runtime installer. It only removes the Expo paths that
require the React bridge, Fabric, UIKit/AppKit view support, or a React
`RuntimeScheduler`. The 9.4 floor comes from ExpoModulesJSI's Swift/C++ interop
interface.

The companion `RNWExpoModulesJSI` overlay keeps Expo's runtime implementation
and adds the narrow queue-identity adapter required by the React Native watch
host. This Core overlay therefore targets that companion module, rather than
claiming an unmodified ExpoModulesJSI build.

Generate it from the repository root:

```sh
pnpm --dir poc/expo-modules-core generate
```

The generator resolves `expo/package.json` using Node's `createRequire`, checks
the exact Expo package versions, and writes the source closure to
`build/ExpoModulesCore`. Generated files are ignored and `node_modules` is
never edited.

Expo's real C++ event emitter reports listener exceptions through the
`cxxreact/ErrorUtils.h` public header supplied by `ReactNativeWatchOSCxx`.

`RNWExpoModulesCore.podspec` produces the Swift module `ExpoModulesCore` and
builds in the isolated `ExpoSmoke` watch-simulator workspace. It uses a custom
module map: Swift imports the Foundation-only runtime bridge headers, while the
real JSI C++ headers remain available to the ObjC++ implementation files.

## Overlay inventory

The generator copies 147 files. It transforms only these Expo Core files:

- `AppContext.swift`: removes bridge, UI-runtime, view lookup, reload, and app
  lifecycle notification paths; adds the scheduler-owner overload for a raw
  host runtime.
- `ExpoRuntime.swift`: retains the host scheduler object until Expo releases
  the adopted runtime.
- `ModuleDefinition.swift`, `CoreModule.swift`, `ModulesProvider.swift`, and
  `AsyncFunctionDefinition.swift`: remove view and legacy registration paths
  while retaining native modules, functions, promises, events, and scheduling.
- `CommonExceptions.swift`, function factories, `Promise.swift`, utilities,
  and log handlers: remove view, optimized-macro, legacy Promise, UIKit, and
  persistent-log dependencies.
- `EXJSIInstaller.{h,mm}`: retains the real `global.expo` JSI installation and
  removes React/bridgeless-only imports.

It omits the view/Fabric/Worklets source families, React bridge adapters,
legacy modules, optimized function implementations, UIKit/AppKit utilities,
and Fabric/bridgeless/test C++ helpers. The `RNWExpoModulesCore` pod also adds
the upstream-required `EXPO_MODULES_CORE_VERSION=57.0.16` definition and the
watch simulator's arm64-only setting.

Validation completed for the generated overlay, podspec, and a Debug
watchOS-simulator `ExpoSmoke` build. Runtime behavior is exercised separately
by the smoke runner.
