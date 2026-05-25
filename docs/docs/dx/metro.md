---
title: Metro & platform resolution
sidebar_position: 1
---

# Metro & platform resolution

`withWatchosMetro` teaches Metro to:

- Resolve `*.watchos.{ts,tsx,js,jsx}` for `?platform=watchos`
  requests.
- Serve the watch bundle from a path that's compatible with the
  Hermes embedder on the watch.
- Alias problematic `react-native` entry files that pull in
  iOS-only modules.

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const {
  withWatchosMetro,
} = require('@appsent-co/react-native-watchos/metro-config');

module.exports = withWatchosMetro(getDefaultConfig(__dirname));
```

> TODO: document custom `entry` / `bundleURL` overrides and how
> aliasing interacts with monorepos.
