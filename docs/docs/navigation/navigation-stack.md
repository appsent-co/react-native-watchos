---
title: NavigationStack
sidebar_position: 1
---

# NavigationStack

SwiftUI `NavigationStack`. Wrap a screen in this to enable push
transitions via descendant `<NavigationLink>` elements. Back gesture
and back button are provided by SwiftUI automatically on watchOS.

```tsx
import {
  NavigationStack,
  VStack,
  Text,
  NavigationLink,
} from '@appsent-co/react-native-watchos/renderer';

function App() {
  return (
    <NavigationStack>
      <VStack>
        <Text>Root screen</Text>
        <NavigationLink>
          <NavigationLink.Label>
            <Text>Go to details</Text>
          </NavigationLink.Label>
          <NavigationLink.Destination>
            <Text>Details!</Text>
          </NavigationLink.Destination>
        </NavigationLink>
      </VStack>
    </NavigationStack>
  );
}
```

## Props

`NavigationStack` takes no props of its own today. Any modifiers
applied to it (`navigationTitle`, `toolbar`, …) decorate the
**current** screen, exactly like SwiftUI.

## With a title

```tsx
import { navigationTitle } from '@appsent-co/react-native-watchos/renderer';

<NavigationStack>
  <VStack modifiers={[navigationTitle('Home')]}>
    <Text>…</Text>
  </VStack>
</NavigationStack>;
```

## Nesting

Place exactly one `NavigationStack` at the root. Pushing happens via
[`NavigationLink`](./navigation-link); nesting stacks doesn't
behave well on watchOS.

For lateral movement between sibling screens use
[`TabView`](./tab-view) instead.

## See also

- [`NavigationLink`](./navigation-link) — pushes the next screen.
- [`TabView`](./tab-view) — paged sibling screens (the watchOS default).
- [`sheet` modifier](./sheet) — modal presentation.
