// MUST be the first import — it sets up React Refresh hooks BEFORE React
// itself loads, and opens the HMR WebSocket so saves on the host trigger
// Fast Refresh on the watch. No-op in production bundles.
import '@appsent-co/react-native-watchos/dev-support';

import { render, Text, VStack } from '@appsent-co/react-native-watchos/renderer';

function App() {
  return (
    <VStack>
      <Text>Hello from watchOS</Text>
    </VStack>
  );
}

render(<App />);
