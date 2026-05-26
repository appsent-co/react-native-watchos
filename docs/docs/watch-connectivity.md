---
title: Watch Connectivity
sidebar_position: 5
---

# Watch Connectivity

`WatchConnectivity` is a typed JavaScript facade over Apple's
[`WCSession`](https://developer.apple.com/documentation/watchconnectivity/wcsession).
It exposes the **same API on both sides of the pairing** — the iOS host
app and the watchOS app import the same module and call the same
methods. The native side picks the right `WCSessionDelegate` callbacks
based on which platform it's running on.

This makes Watch Connectivity the primary way to:

- Send live messages between the phone and the watch.
- Sync a shared key/value context that survives launches.
- Queue background user-info transfers that the OS delivers FIFO.
- Move binary payloads.
- React to reachability and session state changes.

The module is shipped as a TurboModule with codegen, so types stay in
sync with the native implementation.

## Import

```ts
import { WatchConnectivity } from '@appsent-co/react-native-watchos/watch-connectivity';
```

The exact same import works in your iOS app's entrypoint and in your
watchOS entrypoint (e.g. `index.watchos.tsx`).

## Activating the session

Activation is required before any send/receive call. It's idempotent —
calling it twice is safe — so the convention is to call it once on
mount.

```ts
import { useEffect } from 'react';
import { WatchConnectivity } from '@appsent-co/react-native-watchos/watch-connectivity';

useEffect(() => {
  WatchConnectivity.activate().then((state) => {
    console.log('reachable?', state.isReachable);
  });
}, []);
```

`activate()` resolves once activation has been **requested**. The real
`activated` state arrives asynchronously — subscribe to
`'stateChanged'` if you need to know the moment it flips.

## Sending and receiving messages

Live messages are the simplest primitive: best-effort, no queueing,
peer must be reachable.

### Fire-and-forget

```ts
// iOS side
await WatchConnectivity.sendMessage({ type: 'refresh' });
```

```ts
// Watch side
WatchConnectivity.on('message', ({ content }) => {
  if (content.type === 'refresh') {
    // re-fetch data
  }
});
```

### Request / reply

Set `expectReply: true` and the promise resolves with the peer's
returned value. On the other side, **return a value from the handler**
— the facade hides `replyId` plumbing.

```ts
// iOS side — ping the watch
const reply = await WatchConnectivity.sendMessage(
  { ping: Date.now() },
  { expectReply: true, timeoutMs: 5_000 }
);
console.log('pong:', reply);
```

```ts
// Watch side — respond with whatever the peer expects
WatchConnectivity.on('message', ({ content }) => {
  if ('ping' in content) {
    return { pong: content.ping };
  }
});
```

The handler can also return a promise — async work (e.g. a database
read) is awaited before the reply is sent.

```ts
WatchConnectivity.on('message', async ({ content }) => {
  if (content.type === 'load-user') {
    return await fetchUser(content.id);
  }
});
```

:::note Timeouts
`WCSession` has no built-in reply timeout. The facade rejects the
promise after `timeoutMs` (default 30,000 ms) when `expectReply` is
true. Pass `timeoutMs: 0` to disable.
:::

### Binary payloads

For binary data, use the `*Data` variants. Payloads are base64-encoded
on the wire — callers handle encoding/decoding.

```ts
const base64 = btoa(String.fromCharCode(...bytes));
await WatchConnectivity.sendMessageData(base64);

WatchConnectivity.on('messageData', ({ data }) => {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  // ...
});
```

## Application context

Application context is a **last-write-wins persistent dictionary**.
The OS delivers the latest value to the peer, the value survives app
restarts, and it's queryable immediately after activation.

Use it for app-wide state the watch should always know (current user,
theme, sync token).

```ts
// iOS — push the latest context
await WatchConnectivity.updateApplicationContext({
  user: 'maxence',
  theme: 'dark',
  ts: Date.now(),
});
```

```ts
// Watch — read the most recently delivered context
const ctx = await WatchConnectivity.getReceivedApplicationContext();

// or subscribe to updates
WatchConnectivity.on('applicationContext', (ctx) => {
  console.log('new context:', ctx);
});
```

`getApplicationContext()` returns what **this side** last pushed (may
not have been delivered yet). `getReceivedApplicationContext()`
returns what was last received **from the peer**.

## User info transfers

User info transfers are **queued, FIFO, reboot-safe** dictionaries.
The OS delivers them in the background when the peer is reachable —
use them for events you can't afford to drop (analytics, syncs, log
entries).

```ts
// Enqueue
const { id } = await WatchConnectivity.transferUserInfo({
  event: 'workout-completed',
  duration: 1820,
});

// Inspect the outbound queue
const pending = await WatchConnectivity.outstandingUserInfoTransfers();
console.log(`${pending.length} transfers awaiting delivery`);
```

```ts
// Receive on the peer
WatchConnectivity.on('userInfo', (info) => {
  recordEvent(info);
});
```

## Reachability and state

```ts
WatchConnectivity.on('reachabilityChanged', (reachable) => {
  setReachable(reachable);
});

WatchConnectivity.on('stateChanged', (state) => {
  console.log('activation:', state.activationState);
});

// Snapshot
const state = await WatchConnectivity.getState();
```

`SessionState` shape:

| Field | Type | Notes |
| --- | --- | --- |
| `activationState` | `'notActivated' \| 'inactive' \| 'activated'` | |
| `isReachable` | `boolean` | Peer is currently reachable for live messages |
| `isPaired` | `boolean` | iOS-only — always `false` on watch |
| `isWatchAppInstalled` | `boolean` | iOS-only — always `false` on watch |
| `isCompanionAppInstalled` | `boolean` | Watch-only — always `false` on iOS |

## Subscriptions

`on(event, handler)` returns a `Subscription` with a `.remove()`
method. Always remove subscriptions in cleanup.

```ts
useEffect(() => {
  const subs = [
    WatchConnectivity.on('reachabilityChanged', setReachable),
    WatchConnectivity.on('message', handleMessage),
    WatchConnectivity.on('applicationContext', handleContext),
  ];
  return () => subs.forEach((s) => s.remove());
}, []);
```

Available events:

| Event | Payload | Can reply? |
| --- | --- | --- |
| `message` | `{ content: Dictionary, replyId? }` | Yes — return a `Dictionary` |
| `messageData` | `{ data: string (base64), replyId? }` | Yes — return a base64 `string` |
| `applicationContext` | `Dictionary` | No |
| `userInfo` | `Dictionary` | No |
| `reachabilityChanged` | `boolean` | No |
| `stateChanged` | `SessionState` | No |

## Worked example — phone ↔ watch ping

A complete two-sided setup. The phone pings, the watch replies with
the round-trip timestamp.

```tsx
// App.tsx (iOS side)
import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { WatchConnectivity } from '@appsent-co/react-native-watchos/watch-connectivity';

export default function App() {
  const [reachable, setReachable] = useState(false);
  const [lastPong, setLastPong] = useState<number | null>(null);

  useEffect(() => {
    WatchConnectivity.activate().then((s) => setReachable(s.isReachable));
    const sub = WatchConnectivity.on('reachabilityChanged', setReachable);
    return () => sub.remove();
  }, []);

  const ping = async () => {
    const reply = await WatchConnectivity.sendMessage(
      { ping: Date.now() },
      { expectReply: true, timeoutMs: 5_000 }
    );
    setLastPong((reply?.pong as number) ?? null);
  };

  return (
    <View>
      <Text>Reachable: {String(reachable)}</Text>
      <Button title="Ping watch" onPress={ping} />
      {lastPong != null && <Text>Last pong: {lastPong}</Text>}
    </View>
  );
}
```

```tsx
// index.watchos.tsx (watch side)
import { useEffect } from 'react';
import { VStack, Text } from '@appsent-co/react-native-watchos';
import { WatchConnectivity } from '@appsent-co/react-native-watchos/watch-connectivity';

export default function WatchApp() {
  useEffect(() => {
    WatchConnectivity.activate();
    const sub = WatchConnectivity.on('message', ({ content }) => {
      if ('ping' in content) {
        return { pong: content.ping };
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <VStack>
      <Text>Listening for pings…</Text>
    </VStack>
  );
}
```

## API reference

| Method | Description |
| --- | --- |
| `activate()` | Activate `WCSession.default`. Idempotent. |
| `getState()` | Snapshot of the current session state. |
| `sendMessage(msg, opts?)` | Send a live JSON message. Set `expectReply` to await a reply. |
| `sendMessageData(base64, opts?)` | Binary equivalent. Payload is base64-encoded. |
| `updateApplicationContext(ctx)` | Push the last-write-wins shared context. |
| `getApplicationContext()` | The context this side last pushed. |
| `getReceivedApplicationContext()` | The latest context received from the peer. |
| `transferUserInfo(info)` | Enqueue a guaranteed, FIFO background delivery. |
| `outstandingUserInfoTransfers()` | List transfers this side enqueued but the peer hasn't ack'd. |
| `on(event, handler)` | Subscribe to an event. Returns `{ remove() }`. |

Source: [`src/watchConnectivity/`](https://github.com/appsent-co/react-native-watchos/tree/main/src/watchConnectivity).
