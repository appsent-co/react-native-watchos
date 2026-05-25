import { createModifier } from './createModifier';

export interface DrawingGroupParams {
  /// When `true`, the offscreen buffer renders in the extended linear
  /// sRGB color space (higher fidelity for gradients). Default `false`.
  opaque?: boolean;
}

/// SwiftUI `.drawingGroup(opaque:colorMode:)`. Flattens the view's
/// descendants into a single offscreen Metal-rendered image. Useful for
/// composing many layered effects efficiently.
export function drawingGroup(params?: DrawingGroupParams) {
  return createModifier('drawingGroup', { opaque: false, ...params });
}
