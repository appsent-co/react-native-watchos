import { createModifier } from './createModifier';

/// SwiftUI `.interactiveDismissDisabled(_:)`. Conditionally prevents an
/// interactive (swipe / drag) dismissal of the presentation it is applied
/// to — typically a `.sheet`. Pass `false` to re-enable interactive
/// dismissal. Available on watchOS 9+.
export function interactiveDismissDisabled(value = true) {
  return createModifier('interactiveDismissDisabled', { value });
}
