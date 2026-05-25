import { createModifier } from './createModifier';

/// SwiftUI `ToolbarTitleDisplayMode` values.
export type ToolbarTitleDisplayModeValue = 'automatic' | 'inline' | 'large';

export interface ToolbarTitleDisplayModeParams {
  /// `'automatic'` | `'inline'` | `'large'`.
  mode: ToolbarTitleDisplayModeValue;
}

/// SwiftUI `.toolbarTitleDisplayMode(_:)` (watchOS 10+). Controls how the
/// navigation title is displayed. No-op on watchOS 9.
export function toolbarTitleDisplayMode(
  mode: ToolbarTitleDisplayModeValue
): ReturnType<typeof createModifier>;
export function toolbarTitleDisplayMode(
  params: ToolbarTitleDisplayModeParams
): ReturnType<typeof createModifier>;
export function toolbarTitleDisplayMode(
  a: ToolbarTitleDisplayModeParams | ToolbarTitleDisplayModeValue
) {
  if (typeof a === 'string') {
    return createModifier('toolbarTitleDisplayMode', { mode: a });
  }
  return createModifier('toolbarTitleDisplayMode', a);
}
