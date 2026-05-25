---
title: Installation
sidebar_position: 1
---

# Installation

This guide walks you from a fresh Expo project to a working watchOS
app rendering React via SwiftUI. If you already have an Expo iOS app,
skip to [Add the package](#add-the-package).

## Prerequisites

You'll need:

- **macOS** with **Xcode 16+** and the **watchOS SDK** installed
  (open Xcode → Settings → Components → install the watchOS
  simulator runtime).
- **Node.js 20+** and **pnpm** (or **npm** / **yarn** — examples
  below use `npx`/`pnpm`).
- An **Expo SDK 54+** project. If you don't have one yet:

  ```sh
  npx create-expo-app my-app
  cd my-app
  ```

- **Hermes enabled.** Hermes is the default for new Expo apps; if
  you've explicitly disabled it, re-enable it in `app.json`:

  ```json
  { "expo": { "jsEngine": "hermes" } }
  ```

## Add the package

```sh
npx expo install @appsent-co/react-native-watchos @bacons/apple-targets
```

[`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets)
provides the watch target itself (icons,
Info.plist, capabilities). This package owns the runtime (JS engine,
renderer, autolinking, bundle delivery).

## Scaffold the watch target

```sh
npx react-native-watchos init
```

This runs Evan Bacon's `create-target watch` under the hood, then:

- drops a working
  [`ContentView.swift`](https://github.com/appsent-co/react-native-watchos/blob/main/plugin/templates/ContentView.swift)
  into `targets/<name>/` — this is the SwiftUI entry that hosts the
  React root view,
- scaffolds
  [`index.watchos.tsx`](https://github.com/appsent-co/react-native-watchos/blob/main/plugin/templates/index.watchos.tsx)
  at the project root — the JS entry the watch will load,
- patches `app.json` to register the
  `@appsent-co/react-native-watchos` config plugin **after**
  `@bacons/apple-targets`. Plugin order matters: the watch target
  must exist before this package wires the Swift Package into it.

### What just got generated

```
my-app/
├── app.json                  # plugin registered here
├── index.watchos.tsx         # watch JS entry (← edit this)
├── targets/
│   └── watch/
│       ├── ContentView.swift # hosts the React root view
│       ├── Info.plist
│       └── expo-target.config.json
└── ...
```

## Configure Metro

The watch bundle is served by the same Metro instance as your iOS
bundle, but at a different platform key (`watchos`). Wire the helper
into your `metro.config.js`:

```js title="metro.config.js"
const { getDefaultConfig } = require('expo/metro-config');
const {
  withWatchosMetro,
} = require('@appsent-co/react-native-watchos/metro-config');

module.exports = withWatchosMetro(getDefaultConfig(__dirname));
```

This teaches Metro to:

- resolve `*.watchos.{ts,tsx,js,jsx}` files for `?platform=watchos`
  requests,
- alias `react-native` to a tiny watchOS-safe shim (the upstream
  module pulls in iOS-only code via lazy getters),
- serve the watch bundle from the path the embedder expects.

## Prebuild and run

```sh
npx expo prebuild -p ios --clean
npx expo run:ios
```

`prebuild` regenerates `ios/` with the watch target attached. The
config plugin runs during this step — you'll see it install the
Release bundle build phase and run codegen for the
WatchConnectivity spec.

When the iPhone simulator launches, open the **Watch** companion
window (Hardware → Devices → paired Apple Watch in older Xcode, or
File → New Window → Apple Watch in Xcode 16+). Your watch app
launches automatically alongside the phone app.

The first time you run, Hermes takes ~10 s to spin up on the watch.
After that, [Fast Refresh](../dx/fast-refresh) makes edits feel
instant.

## Verify it's working

You should see `Hello from watchOS` on the watch face. Edit
`index.watchos.tsx`:

```tsx title="index.watchos.tsx"
import '@appsent-co/react-native-watchos/dev-support';

import { render, Text, VStack } from '@appsent-co/react-native-watchos/renderer';

function App() {
  return (
    <VStack>
      <Text>Hello from watchOS 👋</Text>
    </VStack>
  );
}

render(<App />);
```

Save. The watch should update in place without a full reload.

## Troubleshooting

**The watch app shows a blank screen.** Check the Metro terminal —
if there's no `watchos` bundle request, the embedder couldn't reach
your dev server. Confirm the watch and your Mac are on the same
network; the watch hits `http://<mac-ip>:8081` by default.

**`Cannot find module 'react-native'` on the watch.** You forgot
`withWatchosMetro` in `metro.config.js` — the shim alias isn't
installed.

**Fast Refresh stops working.** The dev WebSocket dies on suspend.
Either shake the watch to reload (~2.3 g) or rerun `expo run:ios`.

## Next steps

- Build a real screen — see [Your first screen](./your-first-screen).
- Browse the [Renderer overview](../renderer/overview) for the full
  component surface.
- Send data from the phone — see
  [Watch Connectivity](../native/watch-connectivity).
