---
title: Your first screen
sidebar_position: 2
---

# Your first screen

This walks through writing an interactive watch screen — a counter
with a label, a number, two buttons, and a slider. We'll layer in
state, layout, modifiers, and navigation as we go.

If you haven't yet, complete [Installation](./installation) first.

## The starting point

Open `index.watchos.tsx`. After `init`, it looks like this:

```tsx title="index.watchos.tsx"
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
```

Two things worth noting:

- **`dev-support` must be the first import.** It installs the React
  Refresh hooks before React itself loads. In production builds
  it's a no-op.
- **`render(<App />)` is the renderer's entry point.** It mounts
  your React tree into the SwiftUI root view hosted in
  `ContentView.swift`.

:::tip Move `App` into its own file for Fast Refresh
A module is a Fast Refresh boundary only when all its top-level
exports are React components. Because `index.watchos.tsx` calls
`render(...)` — a side effect — edits to it trigger a full reload
and reset state. Split `App` out so saves apply in place:

```tsx title="App.watchos.tsx"
import { Text, VStack } from '@appsent-co/react-native-watchos/renderer';

export default function App() {
  return (
    <VStack>
      <Text>Hello from watchOS</Text>
    </VStack>
  );
}
```

```tsx title="index.watchos.tsx"
import '@appsent-co/react-native-watchos/dev-support';
import { render } from '@appsent-co/react-native-watchos/renderer';
import App from './App';

render(<App />);
```

The snippets below keep everything inline for readability — split
once you start iterating in earnest.
:::

## Add state

```tsx
import { useState } from 'react';
import '@appsent-co/react-native-watchos/dev-support';
import {
  render,
  Text,
  VStack,
  Button,
} from '@appsent-co/react-native-watchos/renderer';

function App() {
  const [count, setCount] = useState(0);

  return (
    <VStack spacing={8}>
      <Text>{`Count: ${count}`}</Text>
      <Button onPress={() => setCount(count + 1)}>
        <Text>+1</Text>
      </Button>
    </VStack>
  );
}

render(<App />);
```

Save. Tap the button on the watch — the count goes up. React state
works exactly like in any other React renderer; the reconciler just
happens to emit SwiftUI views instead of DOM nodes.

:::tip Text children must be strings
`<Text>` only accepts string (or number) children. Template literals
or `String()` calls are your friends:

```tsx
<Text>{`Count: ${count}`}</Text>
<Text>{String(count)}</Text>
```

This isn't a bug — SwiftUI's `Text` is a leaf node, and the bridge
concatenates raw text children into a single styled string.
:::

## Style with modifiers

Every component accepts a `modifiers` prop. Modifiers are factory
functions imported from the same `/renderer` entry; each one maps
1:1 to a SwiftUI modifier.

```tsx
import {
  render,
  Text,
  VStack,
  Button,
  font,
  foregroundColor,
  padding,
} from '@appsent-co/react-native-watchos/renderer';

function App() {
  const [count, setCount] = useState(0);

  return (
    <VStack spacing={12} modifiers={[padding(16)]}>
      <Text
        modifiers={[
          font({ style: 'largeTitle', weight: 'bold' }),
          foregroundColor('accent'),
        ]}
      >
        {String(count)}
      </Text>

      <Button onPress={() => setCount(count + 1)}>
        <Text>+1</Text>
      </Button>
    </VStack>
  );
}
```

Order matters — modifiers compose left-to-right, exactly like
SwiftUI's `.padding().background()` chain.

See [Modifiers](../renderer/modifiers) for the full reference.

## Lay out two buttons

```tsx
import {
  render,
  Text,
  VStack,
  HStack,
  Button,
} from '@appsent-co/react-native-watchos/renderer';

function App() {
  const [count, setCount] = useState(0);

  return (
    <VStack spacing={12}>
      <Text>{String(count)}</Text>

      <HStack spacing={8}>
        <Button onPress={() => setCount(count - 1)}>
          <Text>−</Text>
        </Button>
        <Button onPress={() => setCount(count + 1)}>
          <Text>+</Text>
        </Button>
      </HStack>
    </VStack>
  );
}
```

`HStack` / `VStack` / `ZStack` are your three core layout primitives —
same as SwiftUI. See [Layout](../renderer/layout) for the rest
(`Spacer`, `ScrollView`, `Grid`, …).

## Add a Slider

```tsx
import { Slider } from '@appsent-co/react-native-watchos/renderer';

// inside App
<Slider value={count} min={0} max={20} step={1} onChange={setCount} />
```

The slider is **controlled** — JS owns the truth, the native side
mirrors it locally for instant feedback. This is the pattern for
every input component
([Toggle](../renderer/controls#toggle),
[TextField](../renderer/controls#textfield),
[Picker](../renderer/controls#picker), …).

## Push a second screen

Wrap the root in a `NavigationStack` and add a `NavigationLink`:

```tsx
import {
  NavigationStack,
  NavigationLink,
} from '@appsent-co/react-native-watchos/renderer';

function Detail({ count }: { count: number }) {
  return (
    <VStack>
      <Text>{`The count is ${count}.`}</Text>
    </VStack>
  );
}

function App() {
  const [count, setCount] = useState(0);

  return (
    <NavigationStack>
      <VStack spacing={12}>
        <Text>{String(count)}</Text>

        <Button onPress={() => setCount(count + 1)}>
          <Text>+1</Text>
        </Button>

        <NavigationLink>
          <NavigationLink.Label>
            <Text>Details</Text>
          </NavigationLink.Label>
          <NavigationLink.Destination>
            <Detail count={count} />
          </NavigationLink.Destination>
        </NavigationLink>
      </VStack>
    </NavigationStack>
  );
}
```

Tap **Details** — the watch pushes the second screen with the
system-provided back gesture. See
[NavigationStack](../navigation/navigation-stack) and
[NavigationLink](../navigation/navigation-link) for more.

## Where to next

- Display lists of data — see [Lists](../renderer/lists).
- Add icons (SF Symbols) — see
  [Text & images](../renderer/text-and-images#image).
- Page between screens with the Digital Crown — see
  [TabView](../navigation/tab-view).
- Send data to/from the phone — see
  [Watch Connectivity](../native/watch-connectivity).
