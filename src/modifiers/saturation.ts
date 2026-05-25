import { createModifier } from './createModifier';

/// SwiftUI `.saturation(_:)`. Adjusts the color saturation of the view.
/// `1` is unchanged, `0` is grayscale, and values `> 1` oversaturate.
export function saturation(value: number) {
  return createModifier('saturation', { value });
}
