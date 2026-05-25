import { aspectRatio } from './aspectRatio';

/// SwiftUI `.scaledToFit()`. Shorthand for `aspectRatio({ contentMode: 'fit' })`
/// — fits the view inside its parent without cropping, preserving the
/// intrinsic aspect ratio.
export function scaledToFit() {
  return aspectRatio({ contentMode: 'fit' });
}

/// SwiftUI `.scaledToFill()`. Shorthand for `aspectRatio({ contentMode: 'fill' })`
/// — fills the parent's space, cropping overflow, preserving the
/// intrinsic aspect ratio.
export function scaledToFill() {
  return aspectRatio({ contentMode: 'fill' });
}
