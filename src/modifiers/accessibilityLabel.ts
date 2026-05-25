import { createModifier } from './createModifier';

/// SwiftUI `.accessibilityLabel(_:)`. Sets the label VoiceOver reads to
/// identify the view, overriding any inferred label.
export function accessibilityLabel(label: string) {
  return createModifier('accessibilityLabel', { label });
}
