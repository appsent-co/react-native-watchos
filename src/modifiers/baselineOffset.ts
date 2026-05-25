import { createModifier } from './createModifier';

/// SwiftUI `.baselineOffset(_:)`. Shifts text vertically relative to its
/// baseline, in points. Positive values raise the text; negative values
/// lower it.
export function baselineOffset(value: number) {
  return createModifier('baselineOffset', { value });
}
