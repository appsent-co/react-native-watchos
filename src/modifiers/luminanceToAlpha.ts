import { createModifier } from './createModifier';

/// SwiftUI `.luminanceToAlpha()`. Maps the view's luminance to an alpha
/// mask — bright areas become opaque, dark areas transparent.
export function luminanceToAlpha() {
  return createModifier('luminanceToAlpha');
}
