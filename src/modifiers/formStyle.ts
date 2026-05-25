import { createModifier } from './createModifier';

export type FormStyle = 'automatic' | 'columns' | 'grouped';

/// SwiftUI `.formStyle(_:)`. Sets the visual style applied to `Form`s
/// within the view (watchOS 9+). `'automatic'` defers to the platform
/// default.
export function formStyle(style: FormStyle = 'automatic') {
  return createModifier('formStyle', { style });
}
