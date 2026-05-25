import { createModifier } from './createModifier';

/// SwiftUI `.antialiased(_:)`. Image-only — smooths edges when the
/// image is drawn rotated, scaled, or otherwise off-pixel-grid.
export function antialiased(value: boolean = true) {
  return createModifier('antialiased', { value });
}
