import { createModifier } from './createModifier';

/// SwiftUI `.accessibilityIdentifier(_:)`. Sets a non-localized identifier
/// used by UI tests to locate the view; not spoken by VoiceOver.
export function accessibilityIdentifier(identifier: string) {
  return createModifier('accessibilityIdentifier', { identifier });
}
