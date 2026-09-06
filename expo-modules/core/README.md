# RNW Expo Modules Core overlay

`RNWExpoModulesCore` is a generated, non-UI watchOS source closure derived
from the authentic `expo-modules-core` 57.0.16 sources. It retains Expo’s
native Module DSL, `global.expo` JSI installation, synchronous and asynchronous
functions, promises, events, records, shared objects, and runtime teardown.
It is paired with the `RNWExpoModulesJSI` overlay and requires watchOS 9.4 or
later because ExpoModulesJSI uses Swift/C++ interop.

The pod is named `RNWExpoModulesCore`, while its Swift module stays
`ExpoModulesCore`. That keeps its CocoaPods identity separate from the stock
iOS `ExpoModulesCore` pod, so an app workspace can resolve both platform
closures without a pod-name collision. A single native target must select its
appropriate platform closure; both export the Expo module name.

## Regenerate

The generator never modifies `node_modules`. It resolves packages from the
specified consumer project, verifies every supported package version in
[`../versions.json`](../versions.json), checks the complete upstream Core
`ios` and `common/cpp` source fingerprint, applies every transform exactly
once, and atomically replaces the output only after it has succeeded.

```sh
node expo-modules/core/scripts/generate-overlay.cjs \
  --project-root /path/to/consumer \
  --output expo-modules/core/build/ExpoModulesCore
```

`--check` regenerates into a temporary directory and compares every file
byte-for-byte. The generated `overlay-manifest.json` records the source and
generator hashes, the version matrix, the copied source inventory, and Expo’s
MIT license copy. The generated `build/ExpoModulesCore` tree is an ignored
release artifact and is the only source location used by `RNWExpoModulesCore.podspec`.

## Source closure

The generated closure copies 148 files. It transforms these SDK 57.0.16 files:

- `ios/Core/AppContext.swift` removes React bridge, UI runtime, view lookup,
  reload, and application-notification paths. It accepts a raw host runtime
  and retains the scheduler owner before runtime preparation.
- `ios/Core/ExpoRuntime.swift` stores that owner for the lifetime of the
  adopted runtime.
- `ios/Core/Modules/{ModuleDefinition,CoreModule}.swift`,
  `ios/Core/ModulesProvider.swift`, and
  `ios/Core/Functions/AsyncFunctionDefinition.swift` remove view, worklet, and
  legacy-provider paths while retaining module definitions, functions,
  promises, events, and queue scheduling.
- `ios/Core/Exceptions/CommonExceptions.swift`, function factories,
  `ios/Core/Promise.swift`, utilities, and log handlers remove view,
  optimized-macro, legacy-promise, UIKit, and persistent-file-log dependencies.
- `ios/JS/EXJSIInstaller.{h,mm}` keeps Expo’s actual JSI `global.expo`
  installer while removing React scheduler and bridgeless-only imports.

It excludes UIKit/AppKit view source, Fabric, React bridge adapters, app
delegate hooks, Expo’s React-driven reload hooks, legacy registry providers, optimized-function
implementations, persistent logs, and Fabric/bridgeless/test C++ helpers. The
pod’s public headers are restricted to the Foundation/ObjC runtime bridge.
Authentic C++ JSI and event-emitter headers remain target-private; ObjC++
implementation sources still compile against them. Event-listener exceptions
use the upstream inline `cxxreact/ErrorUtils.h` supplied by
`ReactNativeWatchOSCxx`.

The smoke-test fixture lives in `poc/expo-smoke/Sources` and is not part of
the release artifact.
