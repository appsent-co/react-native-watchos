import { createModifier } from './createModifier';

/// SwiftUI `.kerning(_:)`. Sets the spacing, in points, between each
/// character pair. Positive values add space; negative values tighten.
/// Unlike `tracking`, `kerning` does not affect the trailing edge of the
/// last character.
export function kerning(value: number) {
  return createModifier('kerning', { value });
}
