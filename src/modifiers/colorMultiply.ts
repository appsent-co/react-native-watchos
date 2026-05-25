import { createModifier } from './createModifier';

/// SwiftUI `.colorMultiply(_:)`. Multiplies the view's colors by the
/// given color (a cheap tint). The color string supports named colors
/// (`'red'`, …), SwiftUI semantic colors (`'primary'`, `'accent'`), and
/// `#RRGGBB` / `#RRGGBBAA`.
export function colorMultiply(color: string) {
  return createModifier('colorMultiply', { color });
}
