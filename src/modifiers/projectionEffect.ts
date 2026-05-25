import { createModifier } from './createModifier';
import type { AffineTransformParams } from './transformEffect';

/// SwiftUI `.projectionEffect(_:)`. Bridged via the 2D affine subset:
/// a `ProjectionTransform` is built from `CGAffineTransform(a:b:c:d:tx:ty:)`
/// (same six components as `transformEffect`). Full 3D `CATransform3D`
/// projections are NOT bridged — only affine projections are expressible
/// here. Omitted components default to the identity matrix.
export function projectionEffect(params: AffineTransformParams) {
  return createModifier('projectionEffect', params);
}

export type { AffineTransformParams };
