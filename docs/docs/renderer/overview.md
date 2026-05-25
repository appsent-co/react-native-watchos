---
title: Overview
sidebar_position: 1
---

# Renderer overview

React 19 runs in Hermes on the watch and reconciles a tree of
SwiftUI views via a custom host config. Each React element maps to a
SwiftUI view registered in
[`ViewRegistry`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOS/Registry/ViewRegistry.swift),
and each prop maps to a SwiftUI modifier via
[`ModifierRegistry`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOS/Registry/ModifierRegistry.swift).

Everything ships from one entry point:

```ts
import {
  render,
  Text, VStack, HStack, Button,
  font, padding, foregroundColor,
} from '@appsent-co/react-native-watchos/renderer';
```

A minimal screen:

```tsx
import {
  render,
  VStack,
  Text,
  Button,
} from '@appsent-co/react-native-watchos/renderer';

function App() {
  return (
    <VStack spacing={8}>
      <Text>Hello, watch.</Text>
      <Button onPress={() => console.log('tapped')}>
        <Text>Tap me</Text>
      </Button>
    </VStack>
  );
}

render(<App />);
```

## Components by category

- [Layout](./layout) — `VStack`, `HStack`, `ZStack`, `Spacer`,
  `ScrollView`, lazy stacks, `Grid`.
- [Text & images](./text-and-images) — `Text`, `Image`, `Label`,
  `AsyncImage`.
- [Controls](./controls) — `Button`, `Toggle`, `Slider`, `Stepper`,
  `Picker`, `DatePicker`, `TextField`, `SecureField`.
- [Lists & forms](./lists) — `List`, `Section`, `Form`.

## Navigation

Navigation has its own section:

- [`NavigationStack`](../navigation/navigation-stack)
- [`NavigationLink`](../navigation/navigation-link)
- [`TabView`](../navigation/tab-view)
- [`sheet` modifier](../navigation/sheet)

## Styling

- [Modifiers](./modifiers) — composing SwiftUI modifiers via the
  `modifiers` prop.
- [Styling](./styling) — colors, gradients, fonts.
