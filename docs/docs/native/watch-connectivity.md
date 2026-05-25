---
title: Watch Connectivity
sidebar_position: 2
---

# Watch Connectivity

A typed wrapper around `WCSession` exposed from
[`src/watchConnectivity/`](https://github.com/appsent-co/react-native-watchos/tree/main/src/watchConnectivity).

Capabilities:

- Bidirectional message passing (live and queued).
- User-info and application-context transfer.
- Reachability and activation state subscriptions.
- Binary payloads (`Data` <-> `Uint8Array`).

```ts
import { WatchConnectivity } from '@appsent-co/react-native-watchos/watch-connectivity';

WatchConnectivity.onMessage((msg) => {
  console.log('Got message from phone:', msg);
});

await WatchConnectivity.sendMessage({ type: 'ping' });
```

> TODO: full method-by-method reference and a phone-side example.
