import { createModifier } from './createModifier';

/// SwiftUI `.clipped()`. Clips the view to its bounding frame, hiding any
/// content that extends beyond it.
export function clipped() {
  return createModifier('clipped');
}
