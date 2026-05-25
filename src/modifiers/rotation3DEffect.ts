import { createModifier } from './createModifier';
import type { TransformAnchor } from './rotationEffect';

export interface Rotation3DEffectParams {
  /// Rotation angle in degrees.
  degrees: number;
  /// X component of the rotation axis. Defaults to `0`.
  axisX?: number;
  /// Y component of the rotation axis. Defaults to `1` (rotate about Y).
  axisY?: number;
  /// Z component of the rotation axis. Defaults to `0`.
  axisZ?: number;
  /// 2D anchor point for the rotation. Defaults to `'center'`.
  anchor?: TransformAnchor;
}

/// SwiftUI `.rotation3DEffect(_:axis:anchor:)`. Rotates the view about the
/// 3D axis `(axisX, axisY, axisZ)` by `degrees`. The optional `anchorZ`
/// and perspective parameters are not bridged; defaults are used.
export function rotation3DEffect(params: Rotation3DEffectParams) {
  return createModifier('rotation3DEffect', params);
}
