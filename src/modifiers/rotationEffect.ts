import { createModifier } from './createModifier';

/// Anchor point for a transform, expressed as a named `UnitPoint`.
export type TransformAnchor =
  | 'center'
  | 'top'
  | 'bottom'
  | 'leading'
  | 'trailing'
  | 'topLeading'
  | 'topTrailing'
  | 'bottomLeading'
  | 'bottomTrailing';

export interface RotationEffectParams {
  /// Rotation angle in degrees (positive is clockwise).
  degrees: number;
  /// Point the view rotates about. Defaults to `'center'`.
  anchor?: TransformAnchor;
}

/// SwiftUI `.rotationEffect(_:anchor:)`. Rotates the view in 2D by the
/// given angle (degrees) about `anchor` without affecting layout.
export function rotationEffect(
  params: RotationEffectParams
): ReturnType<typeof createModifier>;
export function rotationEffect(
  degrees: number,
  anchor?: TransformAnchor
): ReturnType<typeof createModifier>;
export function rotationEffect(
  a: RotationEffectParams | number,
  b?: TransformAnchor
) {
  if (typeof a === 'number') {
    return createModifier('rotationEffect', { degrees: a, anchor: b });
  }
  return createModifier('rotationEffect', a);
}
