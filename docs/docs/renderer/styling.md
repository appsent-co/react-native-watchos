---
title: Styling
sidebar_position: 7
---

# Styling, colors, and gradients

## Colors

Every color prop (the `color` arg to `foregroundColor`, the `tint`
on `ProgressView`, the `fill` on a shape, etc.) accepts the same
string format, parsed natively by
[`ColorParser`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOS/Registry/ColorParser.swift):

| Form | Examples |
| --- | --- |
| Named system colors | `"red"`, `"blue"`, `"orange"`, `"green"`, `"yellow"`, `"purple"`, `"pink"`, `"black"`, `"white"`, `"gray"` |
| SwiftUI semantic colors | `"primary"`, `"secondary"`, `"accent"` |
| Hex | `"#RRGGBB"`, `"#RRGGBBAA"` (alpha as last byte) |
| RGB / RGBA functions | `"rgb(255, 128, 0)"`, `"rgba(255, 128, 0, 0.5)"` |

```tsx
import {
  Text,
  foregroundColor,
} from '@appsent-co/react-native-watchos/renderer';

<Text modifiers={[foregroundColor('accent')]}>Highlighted</Text>
<Text modifiers={[foregroundColor('#ff8800')]}>Orange</Text>
<Text modifiers={[foregroundColor('rgba(255, 0, 0, 0.5)')]}>Faded red</Text>
```

`"primary"` and `"secondary"` automatically adapt to light/dark mode
on the watch — prefer them over hard-coded greys.

## Gradients

Three gradient shapes are exposed as first-class components, matching
SwiftUI's `LinearGradient` / `RadialGradient` / `AngularGradient`:

```tsx
import {
  LinearGradient,
} from '@appsent-co/react-native-watchos/renderer';

<LinearGradient
  colors={['#ff8800', '#ff0044']}
  startPoint="topLeading"
  endPoint="bottomTrailing"
/>;
```

`startPoint` / `endPoint` accept either a named `UnitPoint`
(`'top'`, `'leading'`, `'topTrailing'`, …) or an `{ x, y }` pair in
`0…1` units.

A gradient component can also be used as a fill — pass it as the
argument to a shape:

```tsx
import {
  Rectangle,
  background,
  LinearGradient,
} from '@appsent-co/react-native-watchos/renderer';

<Rectangle
  modifiers={[
    background(
      <LinearGradient colors={['#000', '#222']} startPoint="top" endPoint="bottom" />
    ),
  ]}
/>;
```

## Fonts

Use the `font` modifier (see [Modifiers](./modifiers#font-composition)).
Either a system size, a semantic style, or a composed object —
matching SwiftUI's `Font.title.weight(.bold)` chain.

```tsx
import { Text, font } from '@appsent-co/react-native-watchos/renderer';

<Text modifiers={[font('largeTitle')]}>Big</Text>
<Text modifiers={[font(11)]}>Small</Text>
<Text modifiers={[font({ style: 'caption', weight: 'semibold' })]}>
  Tight
</Text>
```

## Dark mode

Dark mode is the watchOS default. SwiftUI's adaptive colors
(`primary`, `secondary`, system named colors) automatically respond
to the trait. To force a scheme on a subtree:

```tsx
import {
  preferredColorScheme,
} from '@appsent-co/react-native-watchos/renderer';

<VStack modifiers={[preferredColorScheme('light')]}>{/* … */}</VStack>;
```
