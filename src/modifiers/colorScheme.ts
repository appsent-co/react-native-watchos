import { createModifier } from './createModifier';

/// SwiftUI `ColorScheme` values.
export type ColorScheme = 'light' | 'dark';

/// SwiftUI `.colorScheme(_:)`. Forces this view's subtree to render with the
/// given color scheme, overriding the system appearance.
export function colorScheme(value: ColorScheme) {
  return createModifier('colorScheme', { value });
}
