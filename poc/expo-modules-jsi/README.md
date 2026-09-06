# Expo Modules JSI on watchOS — PoC

This overlay builds **the installed, authentic `expo-modules-jsi` 57.0.8 sources** against this repository's React Native 0.86.3 / Hermes V1 watch runtime. It does not edit `node_modules`. Two checked Swift source adaptations replace React Native's dedicated-thread assumptions with RNW's serial-queue identity.

The PoC requires **watchOS 9.4 or newer**, because Swift/C++ reference interoperability is unavailable on watchOS 9.0. The existing RN watch runtime can retain its watchOS 9.0 deployment target.

From the repository root:

```sh
./scripts/build-xcframework.sh
./poc/expo-modules-jsi/build.sh all
```

`simulator` builds arm64 only; `device` builds arm64 and arm64_32. `all` builds simulator first and then device. If the shell's `node` is not the project runtime, set `NODE_BINARY` to its absolute path.

`prepare.mjs` resolves Expo's actual dependency graph and rejects versions other than Expo Modules JSI 57.0.8, RN 0.86.3, and Hermes `hermes-v250829098.0.17`. It copies upstream files into ignored `build/poc/expo-modules-jsi/`, then applies checked substitutions to upstream build configuration:

- Add watchOS 9.4, simulator/device architecture lists, and XCFramework slice metadata.
- Resolve JSI against the freshly built watch runtime headers, preserving its ABI.
- Resolve the Hermes framework for each watch platform and retain upstream Swift/C++ interop settings inside the JSI framework.

The overlay changes exactly two copied Swift files: `JavaScriptRuntime.swift` compares the current RNW queue's runtime pointer with its own, and `JavaScriptActor.swift` checks RNW queue membership. All other copied sources and API notes remain byte-for-byte identical. The host exports `RNWCurrentJavaScriptRuntime()`; the pod retains that symbol for dynamic lookup. There is no pthread fallback: calls outside the owning queue must be scheduled through the host, even if they run on the thread that constructed the runtime.

Standalone `JavaScriptRuntime()` is unsupported by this watch-host-only PoC. The upstream packaging step provides Swift module interfaces and public `NativeState.h` without requiring the consuming app to enable C++ interop globally.

The local pod is `RNWExpoModulesJSI`; its framework and Swift module are named `ExpoModulesJSI`. Add it to the watch target after building:

```ruby
pod 'RNWExpoModulesJSI', :path => '../../poc/expo-modules-jsi'
```

The built artifact is:

```text
build/poc/expo-modules-jsi/apple/Products/ExpoModulesJSI.xcframework
```

This retains upstream's dynamic framework and deferred JSI symbol resolution (`-undefined dynamic_lookup`). A successful framework build is a compilation check; the complete PoC must also launch in the watch host and exercise calls across the JSI boundary. The watch linker currently emits a deprecation warning for this upstream linking strategy.
