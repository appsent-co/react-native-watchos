---
slug: /
title: Introduction
sidebar_position: 1
---

# @appsent-co/react-native-watchos

Build watchOS apps with React Native, rendered as native SwiftUI. React
runs in Hermes on the watch and drives a SwiftUI view tree via JSI —
no WebViews, no canvas, no compromises.

:::warning Pre-release
The renderer, JS runtime, Fast Refresh, and Watch Connectivity bridge
are working end-to-end, but APIs may still change and the non-Expo
path is not documented yet.
:::

## What you get

- **Renderer** — React 19 rendering to native SwiftUI, with most of
  the SwiftUI API surface: layout containers, lists, forms,
  navigation, controls, media, shapes, gradients, and
  watch-specific modifiers like digital crown rotation and sensory
  feedback.
- **JS runtime** — Hermes embedded on watchOS via JSI, with
  `console.*`, timers, `fetch`/`XMLHttpRequest`, and `WebSocket`.
- **TurboModules** — Create native modules in Swift / Obj-C++ and call
  them from JS with full codegen support.
- **Watch Connectivity** — Bidirectional messaging, user-info / app
  context sync, reachability, binary payloads.
- **Dev experience** — Metro `?platform=watchos` resolution, Fast
  Refresh over WebSocket, shake-to-reload, on-device error toast,
  `console.*` forwarded to Metro.
- **Expo plugin** — Wires the Swift Package into your watch target,
  runs autolinking, installs the Release bundle build phase, and
  runs codegen for the WatchConnectivity spec.

## Where to next

- New here? Start with the [Installation](./getting-started/installation) guide.
- Hands-on? Walk through [Your first screen](./getting-started/your-first-screen).
- Curious how it works under the hood? Read the
  [Architecture](./architecture) page.
- Building UI? Browse the [Renderer](./renderer/overview) section.
