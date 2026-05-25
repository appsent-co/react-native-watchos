---
title: Modifiers
sidebar_position: 6
---

# Modifiers

In SwiftUI, modifiers wrap a view and return a new view —
`.padding().background(.blue)` builds up styling and behavior. In
this renderer, modifiers are **factory functions** passed as the
`modifiers` prop on any component:

```tsx
import {
  Text,
  font,
  foregroundColor,
  padding,
} from '@appsent-co/react-native-watchos/renderer';

<Text
  modifiers={[
    font({ style: 'title', weight: 'bold' }),
    foregroundColor('accent'),
    padding({ horizontal: 12 }),
  ]}
>
  Hello
</Text>;
```

Order matters — modifiers compose **left-to-right**, exactly like
SwiftUI's chain.

## Anatomy of a modifier

Each modifier is a small factory: `name(params) → { name, args }`.
The bridge ships the array to native; the
[`ModifierRegistry`](https://github.com/appsent-co/react-native-watchos/blob/main/apple/Sources/ReactNativeWatchOS/Registry/ModifierRegistry.swift)
resolves each name to its SwiftUI equivalent and applies it.

```ts
import { padding } from '@appsent-co/react-native-watchos/renderer';

padding(16);                   // .padding(16)
padding({ horizontal: 12 });   // .padding(.horizontal, 12)
padding({ top: 8, bottom: 4 });
```

Number / string / object overloads on a single factory are common —
they mirror SwiftUI's overloaded initializers.

## Modifier families

The full set is organized into barrels (the
[index re-exports](https://github.com/appsent-co/react-native-watchos/blob/main/src/index.ts)
each `export *`):

| Family | Examples |
| --- | --- |
| **Core** | `padding`, `frame`, `font`, `foregroundColor`, `background`, `aspectRatio`, `resizable`, `animation`, `navigationTitle` |
| **Layout** | `frame`, `position`, `offset`, `alignmentGuide`, `containerRelativeFrame` |
| **Styling** | `background`, `foregroundStyle`, `border`, `tint`, `opacity`, `clipShape`, `cornerRadius` |
| **Text** | `font`, `bold`, `italic`, `underline`, `kerning`, `lineLimit`, `multilineTextAlignment` |
| **Interaction** | `onTapGesture`, `onLongPressGesture`, `disabled`, `allowsHitTesting` |
| **Watch** | `digitalCrownRotation`, `sensoryFeedback`, `containerBackground` |
| **Navigation** | `navigationTitle`, `navigationBarTitleDisplayMode`, `toolbar`, `sheet`, `fullScreenCover`, `confirmationDialog`, `alert` |
| **Lists** | `listRowBackground`, `listRowInsets`, `listStyle`, `listSectionSpacing` |
| **Component styles** | `buttonStyle`, `toggleStyle`, `pickerStyle`, `gaugeStyle`, `progressViewStyle` |
| **Input** | `textFieldStyle`, `keyboardType`, `submitLabel`, `focused` |
| **Image / symbols** | `symbolRenderingMode`, `symbolVariant`, `imageScale`, `renderingMode` |
| **Accessibility** | `accessibilityLabel`, `accessibilityHint`, `accessibilityValue`, `accessibilityAddTraits` |
| **Filters / transforms** | `blur`, `brightness`, `colorMultiply`, `rotationEffect`, `scaleEffect` |
| **Scroll** | `scrollDisabled`, `scrollIndicators`, `scrollPosition`, `scrollTargetBehavior` |
| **Presentation** | `presentationDetents`, `presentationCornerRadius`, `presentationBackground`, `presentationDragIndicator` |
| **Gestures** | `onTapGesture`, `onLongPressGesture`, `gesture` |
| **Environment** | `environment`, `preferredColorScheme`, `colorScheme` |
| **Glass** | `glassEffect`, `glassBackgroundEffect` (watchOS 11+) |

This is not the complete list — see
[`src/modifiers/`](https://github.com/appsent-co/react-native-watchos/tree/main/src/modifiers)
for the canonical, type-safe surface.

## Common patterns

### Frame

```tsx
import { frame } from '@appsent-co/react-native-watchos/renderer';

frame({ width: 40, height: 40 });
frame({ maxWidth: 'infinity', alignment: 'leading' });
```

`maxWidth: 'infinity'` maps to SwiftUI's `.infinity` for grow-to-fill
layouts.

### Background + corner radius

```tsx
import {
  background,
  cornerRadius,
} from '@appsent-co/react-native-watchos/renderer';

<VStack
  modifiers={[
    padding(12),
    background('secondary'),
    cornerRadius(12),
  ]}
/>;
```

### Font composition

```ts
import { font } from '@appsent-co/react-native-watchos/renderer';

font('title');                              // semantic
font(14);                                   // system, 14pt
font({ style: 'body', weight: 'semibold' }); // composed
```

### Digital Crown

```tsx
import {
  digitalCrownRotation,
} from '@appsent-co/react-native-watchos/renderer';

<VStack
  modifiers={[
    digitalCrownRotation({
      value: crown,
      from: 0,
      through: 100,
      onChange: setCrown,
    }),
  ]}
/>;
```

The crown is the most watch-specific input — see the
[example app](https://github.com/appsent-co/react-native-watchos/tree/main/example)
for a worked use.
