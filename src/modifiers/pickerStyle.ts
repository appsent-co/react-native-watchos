import { createModifier } from './createModifier';

export type PickerStyle = 'automatic' | 'navigationLink' | 'wheel' | 'inline';

/// SwiftUI `.pickerStyle(_:)`. Sets the visual style applied to `Picker`s
/// within the view. `'automatic'` defers to the platform default.
export function pickerStyle(style: PickerStyle = 'automatic') {
  return createModifier('pickerStyle', { style });
}
