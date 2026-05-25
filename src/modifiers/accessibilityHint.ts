import { createModifier } from './createModifier';

/// SwiftUI `.accessibilityHint(_:)`. Describes the result of performing the
/// view's action, read by VoiceOver after the label.
export function accessibilityHint(hint: string) {
  return createModifier('accessibilityHint', { hint });
}
