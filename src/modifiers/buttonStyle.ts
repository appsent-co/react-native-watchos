import { createModifier } from './createModifier';

export type ButtonStyle =
  | 'automatic'
  | 'bordered'
  | 'borderedProminent'
  | 'borderless'
  | 'plain';

/// SwiftUI `.buttonStyle(_:)`. Sets the visual style applied to `Button`s
/// within the view. `'automatic'` defers to the platform default.
export function buttonStyle(style: ButtonStyle = 'automatic') {
  return createModifier('buttonStyle', { style });
}
