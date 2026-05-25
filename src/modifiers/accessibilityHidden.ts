import { createModifier } from './createModifier';

/// SwiftUI `.accessibilityHidden(_:)`. When `true` (the default), hides the
/// view and its children from assistive technologies.
export function accessibilityHidden(value = true) {
  return createModifier('accessibilityHidden', { value });
}
