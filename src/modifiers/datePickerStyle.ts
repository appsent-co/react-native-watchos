import { createModifier } from './createModifier';

export type DatePickerStyle = 'automatic' | 'wheel';

/// SwiftUI `.datePickerStyle(_:)`. Sets the visual style applied to
/// `DatePicker`s within the view. `'automatic'` defers to the platform
/// default.
export function datePickerStyle(style: DatePickerStyle = 'automatic') {
  return createModifier('datePickerStyle', { style });
}
