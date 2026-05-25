import { createModifier } from './createModifier';

/// SwiftUI `.foregroundStyle(_:)`. Sets the style of foreground content
/// (text glyphs, template images, SF Symbols). The `style` string supports
/// named / `#RRGGBB` / `#RRGGBBAA` colors, SwiftUI semantic colors
/// (`'primary'`, `'secondary'`, `'accent'`), hierarchical levels
/// (`'primary'`, `'secondary'`, `'tertiary'`, `'quaternary'`), `'tint'`,
/// and (watchOS 10+) materials (`'ultraThinMaterial'`, …).
export function foregroundStyle(style: string) {
  return createModifier('foregroundStyle', { style });
}
