---
title: Error toast & shake reload
sidebar_position: 3
---

# Error toast & shake reload

In dev builds, JS errors surface on-device as a toast via
[`ErrorToast`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOS/DevSupport/ErrorToast.swift),
and a quick shake (~2.3 g threshold) reloads the JS bundle via
[`ShakeDetector`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOS/DevSupport/ShakeDetector.swift).

`console.*` from JS is forwarded to the Metro terminal — same
ergonomics as standard React Native debugging, just on a tiny screen.
