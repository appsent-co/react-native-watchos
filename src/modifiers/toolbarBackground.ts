import { createModifier } from './createModifier';

/// SwiftUI `ToolbarPlacement` values usable as the `for:` argument of the
/// toolbar modifiers. On watchOS only `automatic` and `navigationBar` are
/// honored by the native side; other values degrade to `automatic`.
export type ToolbarBars = 'automatic' | 'navigationBar';

export interface ToolbarBackgroundParams {
  /// Shape style for the bar background, resolved by `RNWShapeStyleParser`:
  /// a named/hex color, a hierarchical level (`'primary'`…), `'tint'`, or a
  /// watchOS-10+ material (`'thinMaterial'`…).
  style: string;
  /// Which bar(s) to affect. Defaults to `'automatic'`.
  bars?: ToolbarBars;
}

/// SwiftUI `.toolbarBackground(_:for:)` (watchOS 10+). Sets the background
/// shape style of the navigation bar. No-op on watchOS 9.
export function toolbarBackground(
  style: string,
  bars?: ToolbarBars
): ReturnType<typeof createModifier>;
export function toolbarBackground(
  params: ToolbarBackgroundParams
): ReturnType<typeof createModifier>;
export function toolbarBackground(
  a: ToolbarBackgroundParams | string,
  bars?: ToolbarBars
) {
  if (typeof a === 'string') {
    return createModifier('toolbarBackground', { style: a, bars });
  }
  return createModifier('toolbarBackground', a);
}
