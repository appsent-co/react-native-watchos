---
title: Runtime globals
sidebar_position: 6
---

# Runtime globals

The watch runtime is bare Hermes: nothing from React Native's
`InitializeCore` runs on the watch. The globals a bundle can rely on
come from three places — Hermes itself, the native host
([`RNWHermesHost.mm`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWHermesHost.mm)),
which installs its set before the bundle is evaluated, and
[`src/polyfills.ts`](https://github.com/appsent-co/react-native-watchos/blob/main/src/polyfills.ts),
which adds the rest as a side effect of importing
`@appsent-co/react-native-watchos/renderer` or `/dev-support`.

| Global | Installed by | Notes |
| --- | --- | --- |
| `console.log` / `warn` / `error` / `info` | host + `polyfills` | Forwarded to Metro (`watchOS LOG …`) and the on-device log. |
| `setTimeout` / `clearTimeout` / `setInterval` / `clearInterval` | host | Microtasks are drained after every callback. |
| `setImmediate` / `clearImmediate` | `polyfills` | A macrotask over `setTimeout(fn, 0)` — never a microtask, see [Scheduling](#scheduling). |
| `queueMicrotask` | `polyfills` | Over a resolved promise. |
| `Symbol.asyncIterator` | `polyfills` | The registered symbol `Symbol.for('Symbol.asyncIterator')` — absent from this Hermes build, and without it every `for await` throws. |
| `crypto.getRandomValues` / `crypto.randomUUID` | host ([`RNWCrypto.mm`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWCrypto.mm)) + `polyfills` | `SecRandomCopyBytes` — see below. No `crypto.subtle`. |
| `atob` / `btoa` | Hermes | Built in, spec-shaped (invalid input throws). |
| `TextEncoder` | Hermes | Built in: `encode`, `encodeInto`, `encoding`. |
| `TextDecoder` | host ([`RNWTextDecoder.mm`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWTextDecoder.mm)) | UTF-8 only — see below. |
| `BigInt`, `DataView#getBigInt64` / `setBigInt64` | Hermes | Built in. |
| `XMLHttpRequest` | host ([`RNWXHR.mm`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWXHR.mm)) | `responseType` `''` / `text` / `json` / `arraybuffer`; `blob` reads back `null`. |
| `fetch`, `Headers`, `Request`, `Response` | `polyfills` (`whatwg-fetch`) | Over `XMLHttpRequest`. |
| `WebSocket` | host ([`RNWWebSocket.mm`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOSCxx/RNWWebSocket.mm)) | WHATWG surface plus React Native's `{ headers }` argument — see below. |
| `ErrorUtils`, `reportError` | `polyfills` | Route uncaught errors to `console.error`. |
| `__RNW_DEV_SERVER` | Swift host (DEBUG) | `{ host, port, entry, scheme }` of the Metro that served the bundle. |

Not installed: `URL`, `URLSearchParams`, `AbortController`,
`structuredClone`, `Blob`, `FormData`, `Event` / `EventTarget`,
`performance`, `Buffer`, `global`, and `Intl` (Hermes is built without it
on watchOS, so no `toLocale*`).

The example app's runtime probe
([`example/src/demos/RuntimeProbeDemo.tsx`](https://github.com/appsent-co/react-native-watchos/blob/main/example/src/demos/RuntimeProbeDemo.tsx))
asserts every row of this table and prints one `[RuntimeProbe] PASS | FAIL`
line per check. Run it after touching any of the installers.

## Import order

Host-installed globals exist before the first line of the bundle runs.
The `polyfills` set is installed by the first import of
`@appsent-co/react-native-watchos/renderer` or `/dev-support`, which is
normally the first line of `index.watchos.tsx`. A watch entry that
imports something else first — a library that reads `crypto` or
`Symbol.asyncIterator` at module scope — should import the polyfills
explicitly before it:

```ts
import '@appsent-co/react-native-watchos/polyfills';
```

The import is idempotent and feature-detects every global, so it is a
no-op where the real thing already exists (the phone, say).

## `crypto`

`crypto.getRandomValues(view)` fills an integer typed array
(`Int8Array` … `Uint32Array`, `Uint8ClampedArray`, `BigInt64Array`,
`BigUint64Array`) in place from `SecRandomCopyBytes` and returns the same
object. As in Web Crypto, a `Float32Array` / `Float64Array` / `DataView`
throws a `TypeMismatchError` and more than 65536 bytes a
`QuotaExceededError` — plain `Error`s with `name` set, since Hermes has no
`DOMException`. `crypto.randomUUID()` returns a v4 UUID string.

There is no `crypto.subtle`; pure-JS implementations such as `@noble/*`
run on top of `getRandomValues` alone.

## `TextDecoder`

A WHATWG `TextDecoder` for UTF-8 — the counterpart of the native
`TextEncoder` Hermes ships. It exists before the bundle evaluates, so a
library that does `new TextDecoder('utf-8', { fatal: true })` at module
scope works without any import.

- **Labels** — every label the Encoding Standard maps to UTF-8 (`utf-8`,
  `utf8`, `unicode-1-1-utf-8`, …), trimmed and case-folded; anything else
  is a `RangeError`. `encoding` always reads `'utf-8'`.
- **`fatal`** — `true` throws a `TypeError` on the first malformed
  sequence; `false` (the default) replaces each maximal invalid subpart
  with U+FFFD exactly as the standard's decoder does (overlong forms,
  encoded surrogates, code points above U+10FFFF and truncated sequences
  are all invalid).
- **`ignoreBOM`** — a leading `EF BB BF` is stripped once per stream
  unless set.
- **`decode(input?, { stream })`** — `input` is an `ArrayBuffer`, any
  `ArrayBufferView` (its `byteOffset` / `byteLength` window) or absent
  (`''`). With `{ stream: true }` an incomplete trailing sequence is held
  for the next call instead of being reported.

Native is one primitive over the bytes; the class is a JS shim the host
evaluates at install time, the same split as `WebSocket`.

## Scheduling

Hermes runs with a microtask queue and the host drains it after every
callback it dispatches (timers, network events, TurboModule promises), so
`await` / `.then` continuations run before the next timer tick.

`setImmediate` is deliberately a **macrotask** (`setTimeout(fn, 0)`), as
it is in React Native, even though `queueMicrotask` exists: React's
scheduler prefers `setImmediate` when present, and a microtask
`setImmediate` would run ahead of pending timers and could starve them.

A Fast Refresh full reload tears the runtime down and stands up a new one.
A callback that was already queued for the old runtime — a timer, a socket
or XHR event that raced the reload — is dropped rather than delivered: the
host clears its runtime pointer on the JS queue ahead of destroying the
runtime, and every queued hop re-checks it before running. A native socket
or request whose last reference is dropped off the JS queue (a URLSession
completion that outlived its JS wrapper) releases its JSI handles on the JS
queue, and only while the runtime still exists — handles that would outlive
the runtime are leaked rather than released into freed memory.

## `WebSocket`

Backed by `NSURLSessionWebSocketTask`. The surface is the WHATWG one, which
is what Metro's HMR client and browser-targeted libraries expect:

- **`new WebSocket(url, protocols?, options?)`** — `ws:` / `wss:` (`http:` /
  `https:` are rewritten). `protocols` is a string or an array, offered to
  the server in that order; an invalid token or a duplicate throws a
  `SyntaxError`, as does an unparseable URL. `options` is React Native's
  extension — `{ headers }` rides the upgrade request, see
  [Request headers](#request-headers).
- **`readyState`** with the `CONNECTING` / `OPEN` / `CLOSING` / `CLOSED`
  constants on both the constructor and instances.
- **`url`**, **`protocol`** (the negotiated subprotocol, `''` before `open`
  or when the server selected none), **`extensions`**, **`bufferedAmount`**.
- **`binaryType`** — `'blob'` by default, settable to `'arraybuffer'`.
- **`send(data)`** — a string, an `ArrayBuffer` or any `ArrayBufferView`
  (views are sent as their `byteOffset` / `byteLength` window). Throws an
  `InvalidStateError` while `CONNECTING`; silently dropped once `CLOSING` or
  `CLOSED`. Strings go out as text frames, buffers as binary frames.
- **`close(code?, reason?)`** — `code` must be `1000` or `3000`–`4999`
  (`InvalidAccessError` otherwise), `reason` at most 123 UTF-8 bytes
  (`SyntaxError`). With no code, `1000` is sent.
- **`addEventListener(type, listener, { once })`**,
  **`removeEventListener(type, listener)`**, **`dispatchEvent(event)`**, and
  the `onopen` / `onmessage` / `onerror` / `onclose` handlers. The `on*`
  handler runs first, then listeners in registration order; a listener that
  throws is reported through `reportError` and does not stop the others.
- **Events** — `open`; `message` with `data` (a string for text frames —
  byte-exact, an embedded U+0000 included — an `ArrayBuffer` for binary
  frames); `error` with a `message` string; `close` with `code`, `reason`
  and `wasClean`. Exactly one `close` fires per socket, and it **always**
  follows a transport failure — a dropped TCP connection, a rejected upgrade
  (a `401`, say) or a failed send — after the `error` event, as
  `code: 1006, wasClean: false`.
- **Close codes** — every code a peer may send (`1000`–`4999`) is reported
  with its reason, including the three `URLSessionWebSocketTask.CloseCode`
  has no case for (`1012`–`1014`). URLSession reports those as `1005` and
  hands the raw close-frame payload — the two-byte code followed by the
  reason — as the reason; a genuine no-code close is `1005` with an empty
  reason, and RFC 6455 puts a reason only after a code, so the shape is
  unambiguous and the shim decodes the real code and reason back.
- **Message size** — up to 16 MiB per message (URLSession's default is 1 MiB,
  and a message one byte over that kills the socket).
- **Scheduling** — every event runs on the JS queue and Hermes' microtask
  queue is drained right after the handler returns, so a promise resolved
  inside a `message` handler continues before the next timer tick.

### Request headers

React Native's global takes a third constructor argument, and so does this
one:

```ts
new WebSocket(url, undefined, { headers: { Authorization: `Bearer ${jwt}` } });
```

Every entry is set on the upgrade request — the task is built from an
`NSMutableURLRequest`, and URLSession forwards them, `Authorization`
included. Names must be HTTP tokens and values must not contain CR, LF or
NUL (`SyntaxError` otherwise); a non-object `options` or `options.headers`
is a `TypeError`. The handshake fields URLSession owns — `Connection`,
`Upgrade`, `Host`, `Content-Length` and every `Sec-WebSocket-*` — are
dropped silently; the subprotocol offer is always the `protocols` argument.

A library written against React Native's `WebSocket` that passes a bearer
token this way runs unchanged. Offering the token as a subprotocol entry
still works too, for a gateway that strips `Authorization`.

### Deviations from the spec

1. **No `Blob`.** `binaryType` reads back `'blob'` by default, but binary
   frames are always delivered as `ArrayBuffer`. The first binary frame that
   arrives while `binaryType` is still `'blob'` logs a one-time
   `console.warn`. Set `ws.binaryType = 'arraybuffer'` and this never shows.
2. **Plain event objects.** Hermes has no `Event`, `MessageEvent` or
   `CloseEvent`; events are plain objects carrying `type`, `target`,
   `currentTarget`, `timeStamp` and the fields listed above. The
   DOMException-named errors (`SyntaxError`, `InvalidStateError`,
   `InvalidAccessError`) are plain `Error`s with `name` set.
3. **Lenient subprotocol negotiation.** A browser fails the connection when
   it offered subprotocols and the server selected none; URLSession opens it
   anyway with `protocol === ''`.
4. **A third constructor argument is honoured.** WebIDL ignores extra
   arguments; here `options.headers` is forwarded to the upgrade request,
   React Native's way — see [Request headers](#request-headers).

The example app's `WebSocket` demo
([`example/src/demos/WebSocketDemo.tsx`](https://github.com/appsent-co/react-native-watchos/blob/main/example/src/demos/WebSocketDemo.tsx))
is the conformance probe for this surface; run it against
`example/scripts/ws-echo-server.js` after touching the shim.
