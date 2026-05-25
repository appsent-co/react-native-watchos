import { createModifier } from './createModifier';

/// SwiftUI `.accessibilityValue(_:)`. Sets the spoken value of the view
/// (e.g. a slider's current reading) for assistive technologies.
export function accessibilityValue(value: string) {
  return createModifier('accessibilityValue', { value });
}
