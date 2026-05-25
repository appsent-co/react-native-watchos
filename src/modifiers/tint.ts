import { createModifier } from './createModifier';

/// SwiftUI `.tint(_:)`. Sets the tint color applied to controls and
/// accessory content within the view. The color string supports named
/// colors, SwiftUI semantic colors (`'primary'`, `'accent'`), and
/// `#RRGGBB` / `#RRGGBBAA`.
export function tint(color: string) {
  return createModifier('tint', { color });
}
