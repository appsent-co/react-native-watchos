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
JS execution, Watch Connectivity, autolinking, and bundle delivery.

> TODO: document the runtime-side knobs exposed by the config plugin
> (e.g. watchOS deployment target override).
