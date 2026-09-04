![@appsent-co/react-native-watchos](https://github.com/appsent-co/react-native-watchos/blob/main/docs/static/header.png?raw=true)

📚 **[Read the docs →](https://appsent-co.github.io/react-native-watchos/)**

Build watchOS apps with React, rendered as native SwiftUI. React
runs in Hermes on the watch and drives a SwiftUI view tree via JSI — no
WebViews, no canvas, no compromises.

> ⚠️ Pre-release. The renderer, JS runtime, Fast Refresh, and Watch
> Connectivity bridge are working end-to-end, but APIs may still change
> and the non-Expo path is not documented yet.

## Quick start (Expo)

```sh
npx expo install @appsent-co/react-native-watchos @bacons/apple-targets
npx react-native-watchos init
```

`init` runs Evan Bacon's `create-target watch`, drops a working
[`ContentView.swift`](./plugin/templates/ContentView.swift) into
`targets/<name>/`, scaffolds [`index.watchos.tsx`](./plugin/templates/index.watchos.tsx),
and patches your `app.json` to register the
[`@appsent-co/react-native-watchos`](./plugin/src/index.js) config plugin after
`@bacons/apple-targets`.

Add the Metro helper to your [`metro.config.js`](./example/metro.config.js)
so Metro resolves `*.watchos.{ts,tsx,js,jsx}` for `?platform=watchos`
requests:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withWatchosMetro } = require('@appsent-co/react-native-watchos/metro-config');

module.exports = withWatchosMetro(getDefaultConfig(__dirname));
```

Then prebuild and run:

```sh
npx expo prebuild -p ios --clean
npx expo run:ios
```

## Pure React Native (non-Expo)

Guide in progress. The Swift Package, Metro helper, and renderer all
work without Expo — the missing piece is a non-Expo equivalent of the
watch-target generation and Release bundle build phase that the config
plugin currently handles for you.

## Features

**Renderer** — React 19 rendering to native SwiftUI, with support for
most of the SwiftUI API: layout containers, lists, forms, navigation,
controls, media, shapes, gradients, and watch-specific modifiers like
digital crown rotation and sensory feedback. See
[`src/components/`](./src/components/) and
[`src/modifiers/`](./src/modifiers/) for the full surface.

**JS runtime** — Hermes embedded on watchOS via JSI, with `console.*`,
timers, `queueMicrotask`, `fetch` / `XMLHttpRequest`, a WHATWG `WebSocket`
(subprotocols, React Native's `{ headers }` argument, binary frames as
`ArrayBuffer`, `addEventListener`, `close(code, reason)`),
`crypto.getRandomValues` / `randomUUID`
(`SecRandomCopyBytes`), `TextDecoder` and `Symbol.asyncIterator`
installed; `atob` / `btoa`, `TextEncoder` and `BigInt` come from Hermes
itself. See [`docs/docs/runtime-globals.md`](./docs/docs/runtime-globals.md).

**TurboModules** — Create native modules in Swift / Obj-C++ and call
them from JS with full codegen support.

**Watch Connectivity** — Bidirectional messaging, user-info / app
context sync, reachability and activation state, binary payloads —
exposed from [`src/watchConnectivity/`](./src/watchConnectivity/).

**Secure Storage** — Keychain-backed `getItem` / `setItem` / `removeItem`
for small secrets (a device key, a token), scoped to the app and never
synced — exposed from [`src/secureStorage/`](./src/secureStorage/) and
documented in [`docs/docs/secure-storage.md`](./docs/docs/secure-storage.md).

**Dev experience** — Metro `?platform=watchos` resolution via
`withWatchosMetro`, Fast Refresh over WebSocket, shake-to-reload
(~2.3g), on-device error toast, and `console.*` forwarded to the Metro
terminal.

**Expo plugin** — Wires the Swift Package into your watch target, runs
autolinking with a customizable watchOS deployment target, installs the
Release bundle build phase (`expo export:embed --platform watchos`),
runs codegen for the WatchConnectivity spec, and keeps the runtime's
Info.plist keys in `targets/<name>/Info.plist` (dev-server host/port as
`$(RNW_DEV_SERVER_HOST)` / `$(RNW_DEV_SERVER_PORT)` build settings, the
`NSAllowsLocalNetworking` ATS exception for physical-watch Metro, the
motion usage string for shake-to-reload).

## Customizing the watch target

Icons, display name, Info.plist entries, capabilities, deployment
target — anything about the watch target itself is governed by
`expo-target.config.{json,js}` from
[`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets).
This package only owns the runtime side (plus the few Info.plist keys it
needs, added only when missing — see
[Dev-server endpoint](https://appsent-co.github.io/react-native-watchos/expo-plugin#dev-server-endpoint)
for pointing a DEBUG build at another Metro port or a physical watch).

## Example

A working example app lives in [`example/`](./example/README.md) — a
component gallery, a task-tracking app (Sweepy), and a Pokédex demo.

## License

MIT
