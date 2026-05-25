import { createModifier } from './createModifier';

/// The six components of a 2D affine transform matrix, matching
/// `CGAffineTransform(a:b:c:d:tx:ty:)`:
/// ```
/// | a  b  0 |
/// | c  d  0 |
/// | tx ty 1 |
/// ```
export interface AffineTransformParams {
  /// Horizontal scale (m11). Defaults to `1`.
  a?: number;
  /// Vertical shear (m12). Defaults to `0`.
  b?: number;
  /// Horizontal shear (m21). Defaults to `0`.
  c?: number;
  /// Vertical scale (m22). Defaults to `1`.
  d?: number;
  /// Horizontal translation. Defaults to `0`.
  tx?: number;
  /// Vertical translation. Defaults to `0`.
  ty?: number;
}

/// SwiftUI `.transformEffect(_:)`. Applies an arbitrary 2D affine
/// transform built from `CGAffineTransform(a:b:c:d:tx:ty:)` to the
/// view's rendered output. Omitted components default to the identity
/// matrix (`a = d = 1`, others `0`).
export function transformEffect(params: AffineTransformParams) {
  return createModifier('transformEffect', params);
}
