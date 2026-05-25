import { createModifier } from './createModifier';

export type ProgressViewStyle = 'automatic' | 'linear' | 'circular';

/// SwiftUI `.progressViewStyle(_:)`. Sets the visual style applied to
/// `ProgressView`s within the view. `'automatic'` defers to the platform
/// default.
export function progressViewStyle(style: ProgressViewStyle = 'automatic') {
  return createModifier('progressViewStyle', { style });
}
