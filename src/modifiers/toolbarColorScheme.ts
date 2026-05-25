import { createModifier } from './createModifier';
import type { ToolbarBars } from './toolbarBackground';

/// Toolbar color scheme. `null` (or omitted) restores the automatic scheme.
export type ToolbarColorScheme = 'light' | 'dark' | null;

export interface ToolbarColorSchemeParams {
  /// `'light'`, `'dark'`, or `null`/undefined for automatic.
  colorScheme?: ToolbarColorScheme;
  /// Which bar(s) to affect. Defaults to `'automatic'`.
  bars?: ToolbarBars;
}

/// SwiftUI `.toolbarColorScheme(_:for:)` (watchOS 10+). Forces a color scheme
/// on the navigation bar. Passing `null` clears the override. No-op on
/// watchOS 9.
export function toolbarColorScheme(
  colorScheme: ToolbarColorScheme,
  bars?: ToolbarBars
): ReturnType<typeof createModifier>;
export function toolbarColorScheme(
  params: ToolbarColorSchemeParams
): ReturnType<typeof createModifier>;
export function toolbarColorScheme(
  a: ToolbarColorSchemeParams | ToolbarColorScheme,
  bars?: ToolbarBars
) {
  if (a === null || typeof a === 'string') {
    return createModifier('toolbarColorScheme', { colorScheme: a, bars });
  }
  return createModifier('toolbarColorScheme', a);
}
