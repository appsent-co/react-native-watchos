---
title: TurboModules
sidebar_position: 1
---

# TurboModules

Create native modules in Swift or Obj-C++ and call them from JS with
full codegen support. `@appsent-co/react-native-watchos` ships with a
[`RNWTurboModuleRegistry`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWTurboModuleRegistry.mm)
that's compatible with the standard React Native module spec
generator.

## What works

- Sync and async methods.
- Promise-returning methods.
- Event emitters via
  [`RNWRCTEventEmitter`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWRCTEventEmitter.mm).
- Codegen-driven specs (see the bundled `RNWatchConnectivity` module
  for a worked example).

## A minimal module

> TODO: walk through registering a module end-to-end (spec, Swift
> impl, registration in the watch target).
