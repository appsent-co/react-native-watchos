---
title: TabView
sidebar_position: 3
---

# TabView

SwiftUI `TabView` with watchOS-style paged navigation. Swipe (or
spin the Digital Crown) to page between sibling screens.

Each child declares a string `tabTag` prop; the `selection` prop
matches one of those tags. The control is **controlled** — JS owns
the selection, the native side reports changes via
`onSelectionChange`.

```tsx
import {
  TabView,
  VStack,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

function App() {
  const [tab, setTab] = useState('rooms');

  return (
    <TabView selection={tab} onSelectionChange={setTab}>
      <VStack tabTag="rooms">
        <Text>Rooms</Text>
      </VStack>
      <VStack tabTag="schedule">
        <Text>Schedule</Text>
      </VStack>
      <VStack tabTag="settings">
        <Text>Settings</Text>
      </VStack>
    </TabView>
  );
}
```

## Props

| Prop | Type | Notes |
| --- | --- | --- |
| `selection` | `string` | Currently selected tab. Matched against each child's `tabTag`. Defaults to the first child's `tabTag`, or its index position if none was set. |
| `onSelectionChange` | `(tag: string) => void` | Fires when the user pages to a different tab. Mirror the new tag back into `selection`. |
| `style` | `'page'` \| `'automatic'` | Tab navigation style. Defaults to `'page'` — the watchOS norm. `'automatic'` lets SwiftUI pick. |

## When to use TabView vs NavigationStack

- **TabView** for **lateral** sibling screens. The watch's default
  navigation idiom — swipe between equally-important views.
- **NavigationStack** for **hierarchical** drill-down. Push a detail
  screen from a list row.

The two compose: a `NavigationStack` can host a `TabView` as its root
screen, or live inside a single tab.

## See also

- [`NavigationStack`](./navigation-stack) — hierarchical push/pop.
- [`sheet` modifier](./sheet) — modal presentation.
