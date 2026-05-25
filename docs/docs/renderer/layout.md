---
title: Layout
sidebar_position: 2
---

# Layout

The three core stacks (`VStack`, `HStack`, `ZStack`) plus `Spacer`,
`Divider`, and `ScrollView` cover ~90% of watch layouts. For grids
and lazy stacks, see the [Lazy containers](#lazy-containers) section
at the bottom.

## VStack

Vertical stack — children laid out top to bottom.

```tsx
import {
  VStack,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

<VStack alignment="leading" spacing={8}>
  <Text>First</Text>
  <Text>Second</Text>
</VStack>;
```

| Prop | Type | Default |
| --- | --- | --- |
| `alignment` | `'leading'` \| `'center'` \| `'trailing'` | `'center'` |
| `spacing` | `number` | system default |

## HStack

Horizontal stack — children laid out leading to trailing.

```tsx
import {
  HStack,
  Text,
  Image,
} from '@appsent-co/react-native-watchos/renderer';

<HStack spacing={8}>
  <Image systemName="bolt.fill" />
  <Text>Charging</Text>
</HStack>;
```

| Prop | Type | Default |
| --- | --- | --- |
| `alignment` | `'top'` \| `'center'` \| `'bottom'` \| `'firstTextBaseline'` \| `'lastTextBaseline'` | `'center'` |
| `spacing` | `number` | system default |

## ZStack

Z-axis stack — children stack on top of each other.

```tsx
import {
  ZStack,
  Rectangle,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

<ZStack alignment="bottomTrailing">
  <Rectangle />
  <Text>Overlay</Text>
</ZStack>;
```

| Prop | Type | Default |
| --- | --- | --- |
| `alignment` | `'leading' \| 'trailing' \| 'top' \| 'bottom' \| 'center' \| 'topLeading' \| 'topTrailing' \| 'bottomLeading' \| 'bottomTrailing'` | `'center'` |

## Spacer

Pushes siblings apart. Inside a `VStack` it grows vertically; inside
an `HStack` it grows horizontally.

```tsx
<HStack>
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</HStack>
```

| Prop | Type | Notes |
| --- | --- | --- |
| `minLength` | `number` | Minimum length the spacer will take, in points. |

## Divider

A thin separator line. Inside a stack, it runs perpendicular to the
stack's axis.

```tsx
<VStack>
  <Text>Header</Text>
  <Divider />
  <Text>Body</Text>
</VStack>
```

No props.

## ScrollView

Scroll its content when it overflows.

```tsx
import {
  ScrollView,
  VStack,
} from '@appsent-co/react-native-watchos/renderer';

<ScrollView axes="vertical">
  <VStack>{/* many children */}</VStack>
</ScrollView>;
```

| Prop | Type | Default |
| --- | --- | --- |
| `axes` | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` |
| `showsIndicators` | `boolean` | `true` |

:::tip List vs ScrollView
For long lists of homogeneous data, prefer [`List`](./lists#list) —
it recycles row views. `ScrollView` is for arbitrary content that
just needs to scroll.
:::

## Group

A logical wrapper that doesn't render any view of its own — useful
for applying a single modifier to a group of children, or returning
multiple children from a render slot.

```tsx
import {
  Group,
  Text,
  font,
} from '@appsent-co/react-native-watchos/renderer';

<Group modifiers={[font('caption')]}>
  <Text>One</Text>
  <Text>Two</Text>
</Group>;
```

## Lazy containers

For long content, the lazy variants only realize children near the
viewport — important on a tiny CPU:

- `LazyVStack` — same API as `VStack`, but lazy.
- `LazyHStack` — same API as `HStack`, but lazy.
- `LazyVGrid` / `LazyHGrid` — grid layouts with column or row
  templates (see `gridItem()`).
- `Grid` / `GridRow` — non-lazy fixed grids.

```tsx
import {
  LazyVGrid,
  gridItem,
  Text,
} from '@appsent-co/react-native-watchos/renderer';

<LazyVGrid columns={[gridItem('flexible'), gridItem('flexible')]} spacing={6}>
  {items.map((i) => (
    <Text key={i}>{String(i)}</Text>
  ))}
</LazyVGrid>;
```

## See also

- [Modifiers](./modifiers) — `padding`, `frame`, `background`,
  `cornerRadius`, etc.
- [Lists](./lists) — `List`, `Section`, `Form`.
