import { createModifier } from './createModifier';

/// SwiftUI `.listItemTint(_:)`. Tints list-item content (e.g. a row's
/// accessory or selection accent). The color string supports named colors
/// (`'red'`, …), SwiftUI semantic colors (`'primary'`, `'accent'`), and
/// `#RRGGBB` / `#RRGGBBAA`.
export function listItemTint(color: string) {
  return createModifier('listItemTint', { color });
}
