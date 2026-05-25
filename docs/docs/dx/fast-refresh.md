---
title: Fast Refresh
sidebar_position: 2
---

# Fast Refresh

The watch runtime opens a WebSocket back to Metro and applies HMR
updates in-place — your component tree updates without losing state.

How it's wired:

- Metro emits HMR updates over WebSocket.
- The watch
  [`RNWWebSocket`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWWebSocket.mm)
  client subscribes.
- Updates are routed into the JS runtime via JSI.

If Fast Refresh stops working, common culprits:

- The watch lost its WebSocket connection (suspend / network change).
- Metro is serving from a path the watch isn't subscribed to (see
  the workspace bundle-path note in
  [Metro & platform resolution](./metro)).
