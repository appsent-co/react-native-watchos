import { createModifier } from './createModifier';

export type LabelStyle =
  | 'automatic'
  | 'iconOnly'
  | 'titleOnly'
  | 'titleAndIcon';

/// SwiftUI `.labelStyle(_:)`. Sets the visual style applied to `Label`s
/// within the view. `'automatic'` defers to the platform default.
export function labelStyle(style: LabelStyle = 'automatic') {
  return createModifier('labelStyle', { style });
}
