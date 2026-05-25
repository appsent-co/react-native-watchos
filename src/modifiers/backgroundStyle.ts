import { createModifier } from './createModifier';

/// SwiftUI `.backgroundStyle(_:)` (watchOS 9+). Sets the default style for
/// the backgrounds of views within this view. The `style` string supports
/// named / `#RRGGBB` / `#RRGGBBAA` colors, SwiftUI semantic colors,
/// hierarchical levels, `'tint'`, and (watchOS 10+) materials — resolved by
/// the shared shape-style parser.
export function backgroundStyle(style: string) {
  return createModifier('backgroundStyle', { style });
}
