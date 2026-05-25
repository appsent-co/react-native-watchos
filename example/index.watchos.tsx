// Watch-specific entry. Metro picks this up over `index.js` whenever the
// bundle request carries `?platform=watchos`, because metro.config.js wraps
// the default config with `withWatchosMetro` from
// `@appsent-co/react-native-watchos/metro-config`.

// MUST be the first import — it sets up React Refresh hooks BEFORE React
// itself loads, and opens the HMR WebSocket so saves on the host trigger
// Fast Refresh on the watch. No-op in production bundles.
import '@appsent-co/react-native-watchos/dev-support';

import { render } from '@appsent-co/react-native-watchos/renderer';

import App from './App';

// App lives in its own module so it's a Fast Refresh boundary (a module is
// a boundary when all its top-level exports are React components). Editing
// this entry triggers a full reload via `__RNW_RELOAD`; editing App.tsx
// applies in-place.
render(<App />);
