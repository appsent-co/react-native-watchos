---
title: Text & images
sidebar_position: 3
---

# Text & images

## Text

SwiftUI `Text`. Children **must be strings** (or numbers, coerced) —
the native side concatenates raw text children into a single styled
string. Style with the `modifiers` prop.

```tsx
import {
  Text,
  font,
  foregroundColor,
} from '@appsent-co/react-native-watchos/renderer';

<Text>Hello</Text>
<Text>{`Score: ${score}`}</Text>
<Text
  modifiers={[
    font({ style: 'title', weight: 'bold' }),
    foregroundColor('accent'),
  ]}
>
  Headline
</Text>
```

:::warning No nested components
`<Text>{<Icon />}</Text>` won't work — children must be strings.
For an icon-with-caption row, use [`Label`](#label) or compose with
[`HStack`](./layout#hstack).
:::

For styling options see [Modifiers](./modifiers#font-composition)
and [Styling](./styling).

## Image

SwiftUI `Image`. Today the only source is an **SF Symbol** name —
asset-catalog and remote images come later (use [`AsyncImage`](#asyncimage)
for the latter).

```tsx
import { Image } from '@appsent-co/react-native-watchos/renderer';

<Image systemName="heart.fill" />
<Image systemName="arrow.clockwise" />
```

| Prop | Type | Notes |
| --- | --- | --- |
| `systemName` | `string` | SF Symbol name. Browse the catalog in Apple's [SF Symbols app](https://developer.apple.com/sf-symbols/). |

Apply rendering options via [Modifiers](./modifiers):

```tsx
import {
  Image,
  symbolRenderingMode,
  foregroundColor,
} from '@appsent-co/react-native-watchos/renderer';

<Image
  systemName="bolt.fill"
  modifiers={[
    symbolRenderingMode('hierarchical'),
    foregroundColor('yellow'),
  ]}
/>;
```

## Label

A pre-composed `Label` — pairs a title string with an SF Symbol
icon. This is the canonical "icon + text" row used in lists,
toolbars, and navigation links.

```tsx
import { Label } from '@appsent-co/react-native-watchos/renderer';

<Label title="Settings" systemImage="gearshape.fill" />
<Label title="Battery" systemImage="bolt.fill" />
```

| Prop | Type |
| --- | --- |
| `title` | `string` |
| `systemImage` | `string` (SF Symbol name) |

## AsyncImage

SwiftUI `AsyncImage` — fetches an image from a URL with built-in
phase handling (empty / loading / success / failure).

The basic form is intrinsic-sized with the system spinner and a
fallback broken-image glyph:

```tsx
import { AsyncImage } from '@appsent-co/react-native-watchos/renderer';

<AsyncImage url="https://example.com/avatar.png" />
```

To customize each phase, use the slot API:

```tsx
import {
  AsyncImage,
  ProgressView,
  Image,
  frame,
  resizable,
  aspectRatio,
} from '@appsent-co/react-native-watchos/renderer';

<AsyncImage
  url={user.avatarUrl}
  modifiers={[frame({ width: 40, height: 40 })]}
>
  <AsyncImage.Empty>
    <ProgressView />
  </AsyncImage.Empty>
  <AsyncImage.Success>
    <AsyncImage.Image
      modifiers={[resizable(), aspectRatio({ contentMode: 'fit' })]}
    />
  </AsyncImage.Success>
  <AsyncImage.Failure>
    <Image systemName="photo" />
  </AsyncImage.Failure>
</AsyncImage>;
```

:::tip Image-only modifiers on the loaded image
`resizable()` and `aspectRatio({ contentMode })` must apply to
`<AsyncImage.Image />`, not the outer `AsyncImage` — they preserve
the `Image → Image` chain the way SwiftUI's
`{ image in image.resizable() }` closure does. Generic modifiers
(`frame`, `padding`) belong on the outer `AsyncImage` so they also
size the empty/failure states.
:::

| Prop | Type | Notes |
| --- | --- | --- |
| `url` | `string` | Absolute URL. Invalid URLs render nothing. |
| `scale` | `number` | Pixel scale. Defaults to `1`. Use `2` / `3` for @2x / @3x assets. |
