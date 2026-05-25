import { createModifier } from './createModifier';

/// SwiftUI `.scrollDisabled(_:)`. Disables (or re-enables) scrolling of
/// scrollable containers nested in this view. watchOS 9+.
export function scrollDisabled(disabled = true) {
  return createModifier('scrollDisabled', { disabled });
}
