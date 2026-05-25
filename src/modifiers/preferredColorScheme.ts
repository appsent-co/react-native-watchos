import { createModifier } from './createModifier';
import type { ColorScheme } from './colorScheme';

/// SwiftUI `.preferredColorScheme(_:)`. Sets the preferred color scheme for
/// the enclosing presentation (e.g. a sheet or the watch root). Pass `null`
/// (or omit) to clear the preference and follow the system appearance.
export function preferredColorScheme(value: ColorScheme | null = null) {
  return createModifier('preferredColorScheme', { value });
}
