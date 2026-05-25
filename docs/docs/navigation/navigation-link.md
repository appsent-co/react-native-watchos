---
title: NavigationLink
sidebar_position: 2
---

# NavigationLink

SwiftUI `NavigationLink`. Place inside a
[`NavigationStack`](./navigation-stack) — tapping the label pushes
the destination onto the stack.

The component uses a **two-slot child API**: a single
`<NavigationLink.Label>` (the visible row) and a single
`<NavigationLink.Destination>` (the pushed screen). This mirrors
SwiftUI's `NavigationLink { destination } label: { label }` overload.

```tsx
import {
  NavigationLink,
  Text,
  VStack,
} from '@appsent-co/react-native-watchos/renderer';

<NavigationLink>
  <NavigationLink.Label>
    <Text>Room A</Text>
  </NavigationLink.Label>
  <NavigationLink.Destination>
    <TasksScreen />
  </NavigationLink.Destination>
</NavigationLink>;
```

## Inside a List

This is the canonical pattern — each row is its own link:

```tsx
import {
  List,
  NavigationLink,
  Label,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

<List>
  {rooms.map((room) => (
    <NavigationLink key={room.id}>
      <NavigationLink.Label>
        <Label title={room.name} systemImage="house.fill" />
      </NavigationLink.Label>
      <NavigationLink.Destination>
        <RoomScreen room={room} />
      </NavigationLink.Destination>
    </NavigationLink>
  ))}
</List>;
```

## Why slots, not props?

`destination` could have been a React element prop, but child slots
let modifiers compose against the destination subtree like any
other view tree. The
[`Section`](../renderer/lists#section) component uses the same
pattern (`Section.Header`, `Section.Footer`).

## Outside a NavigationStack

If `NavigationLink` is rendered without an ancestor
`NavigationStack`, the label renders inline as a plain row and tapping
it is a no-op. This is graceful degradation, not an intended pattern —
always wrap your root screen in a `NavigationStack`.

## See also

- [`NavigationStack`](./navigation-stack) — the host.
- [`TabView`](./tab-view) — lateral, not hierarchical, navigation.
