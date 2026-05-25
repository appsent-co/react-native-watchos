import { createModifier } from './createModifier';

export type ToggleStyle = 'automatic' | 'button' | 'switch';

/// SwiftUI `.toggleStyle(_:)`. Sets the visual style applied to `Toggle`s
/// within the view. `'automatic'` defers to the platform default.
export function toggleStyle(style: ToggleStyle = 'automatic') {
  return createModifier('toggleStyle', { style });
}
