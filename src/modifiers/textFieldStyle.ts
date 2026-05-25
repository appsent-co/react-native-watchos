import { createModifier } from './createModifier';

export type TextFieldStyle = 'automatic' | 'plain' | 'roundedBorder';

/// SwiftUI `.textFieldStyle(_:)`. Sets the visual style applied to
/// `TextField`s within the view. `'automatic'` defers to the platform
/// default.
export function textFieldStyle(style: TextFieldStyle = 'automatic') {
  return createModifier('textFieldStyle', { style });
}
