import { createModifier } from './createModifier';
import type { ToolbarBars } from './toolbarBackground';

/// SwiftUI `Visibility` values.
export type ToolbarVisibilityValue = 'automatic' | 'visible' | 'hidden';

export interface ToolbarVisibilityParams {
  /// `'automatic'` | `'visible'` | `'hidden'`.
  visibility: ToolbarVisibilityValue;
  /// Which bar(s) to affect. Defaults to `'automatic'`.
  bars?: ToolbarBars;
}

/// SwiftUI `.toolbarVisibility(_:for:)` on newer OSes, falling back to the
/// watchOS-9 `.toolbar(_ Visibility, for:)`. Shows or hides the bar(s).
export function toolbarVisibility(
  visibility: ToolbarVisibilityValue,
  bars?: ToolbarBars
): ReturnType<typeof createModifier>;
export function toolbarVisibility(
  params: ToolbarVisibilityParams
): ReturnType<typeof createModifier>;
export function toolbarVisibility(
  a: ToolbarVisibilityParams | ToolbarVisibilityValue,
  bars?: ToolbarBars
) {
  if (typeof a === 'string') {
    return createModifier('toolbarVisibility', { visibility: a, bars });
  }
  return createModifier('toolbarVisibility', a);
}
