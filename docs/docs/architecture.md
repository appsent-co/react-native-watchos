---
title: Architecture
---

# Architecture

```
┌─────────────────────────────────────────────────┐
│                JS (Hermes on watch)             │
│   React 19  →  react-reconciler (custom host)   │
└──────────────────────┬──────────────────────────┘
                       │ JSI
┌──────────────────────▼──────────────────────────┐
│            ReactNativeWatchOSCxx                │
│  Hermes host, TurboModule registry, UI manager, │
│  XHR/WebSocket, event emitter                   │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│              ReactNativeWatchOS (Swift)         │
│  RNWRootView  +  ViewRegistry / ModifierRegistry│
│         →  native SwiftUI view tree             │
└─────────────────────────────────────────────────┘
```

## The three layers

1. **JS** — Your React tree, running in Hermes. Reconciliation is
   handled by a custom host config targeting react-reconciler
   `0.32.x`.
2. **C++/Obj-C++ bridge** — Hosts Hermes, owns the TurboModule
   registry, implements JSI shims (`fetch`, `XMLHttpRequest`,
   `WebSocket`, timers, `console`), and routes UI commands to the
   Swift layer.
3. **Swift (SwiftUI)** — Reads the shadow tree snapshot, looks up
   each node in `ViewRegistry`, applies its props via
   `ModifierRegistry`, and emits a real SwiftUI view tree from
   [`RNWRootView`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOS/RNWRootView.swift).

## Key files

- [`apple/Sources/ReactNativeWatchOSCxx/RNWHermesHost.mm`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWHermesHost.mm) — Hermes lifecycle.
- [`apple/Sources/ReactNativeWatchOSCxx/RNWUIManager.mm`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWUIManager.mm) — JSI -> shadow tree.
- [`apple/Sources/ReactNativeWatchOS/Registry/RNWNodeRenderer.swift`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOS/Registry/RNWNodeRenderer.swift) — shadow tree -> SwiftUI.
