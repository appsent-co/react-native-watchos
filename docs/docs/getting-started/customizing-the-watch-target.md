---
title: Customizing the watch target
sidebar_position: 3
---

# Customizing the watch target

Icons, display name, Info.plist entries, capabilities, deployment
target — anything about the watch target itself is governed by
`expo-target.config.{json,js}` from
[`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets).

`@appsent-co/react-native-watchos` only owns the runtime side: rendering,
JS execution, Watch Connectivity, autolinking, and bundle delivery. The
one thing it writes into `targets/<name>/Info.plist` is the handful of
keys that runtime needs (`RNWDevServerHost` / `RNWDevServerPort`, the
`NSAllowsLocalNetworking` ATS exception, `NSMotionUsageDescription`) —
only when they are missing, so your own values always win. See
[Dev-server endpoint](../expo-plugin#dev-server-endpoint).

> TODO: document the runtime-side knobs exposed by the config plugin
> (e.g. watchOS deployment target override).
