import { createModifier } from './createModifier';

/// SwiftUI `.foregroundColor(_:)`. Sets the tint of foreground content
/// (text glyphs, template images, SF Symbols). The color string supports
/// named colors (`'red'`, …), SwiftUI semantic colors (`'primary'`,
/// `'secondary'`, `'accent'`), and `#RRGGBB` / `#RRGGBBAA`.
export function foregroundColor(color: string) {
  return createModifier('foregroundColor', { color });
}
