import { createModifier } from './createModifier';

/// SwiftUI `.contrast(_:)`. Multiplies the view's color contrast by
/// `value`. `1` is unchanged, `0` is solid gray, values `> 1` increase
/// contrast, and negative values invert colors.
export function contrast(value: number) {
  return createModifier('contrast', { value });
}
