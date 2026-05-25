import { createModifier } from './createModifier';

/// Visibility of a presentation's drag indicator. Mirrors SwiftUI's
/// `Visibility`.
export type DragIndicatorVisibility = 'automatic' | 'visible' | 'hidden';

/// SwiftUI `.presentationDragIndicator(_:)`. Sets the visibility of the
/// drag indicator on top of a sheet. Defaults to `'automatic'`, letting
/// the system decide. Available on watchOS 9+.
export function presentationDragIndicator(
  visibility: DragIndicatorVisibility = 'automatic'
) {
  return createModifier('presentationDragIndicator', { visibility });
}
