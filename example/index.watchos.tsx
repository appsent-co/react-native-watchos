// Watch-specific entry, picked up by Metro for `?platform=watchos`.

// MUST be first — installs React Refresh hooks before React loads and
// opens the HMR WebSocket. No-op in production bundles.
import '@appsent-co/react-native-watchos/dev-support';

import { render } from '@appsent-co/react-native-watchos/renderer';

import App from './App';

render(<App />);
