import { createModifier } from './createModifier';
import type { TransformAnchor } from './rotationEffect';

export interface ScaleEffectParams {
  /// Uniform scale applied to both axes. Overridden by `x` / `y` when set.
  scale?: number;
  /// Horizontal scale factor. Falls back to `scale`, then `1`.
  x?: number;
  /// Vertical scale factor. Falls back to `scale`, then `1`.
  y?: number;
  /// Anchor the scaling expands/contracts around. Defaults to `'center'`.
  anchor?: TransformAnchor;
}

/// SwiftUI `.scaleEffect(x:y:anchor:)`. Scales the view's rendered output
/// (not its layout). Pass a single number for a uniform scale, or an
/// object for per-axis control.
export function scaleEffect(
  params: ScaleEffectParams
): ReturnType<typeof createModifier>;
export function scaleEffect(
  scale: number,
  anchor?: TransformAnchor
): ReturnType<typeof createModifier>;
export function scaleEffect(
  a: ScaleEffectParams | number,
  b?: TransformAnchor
) {
  if (typeof a === 'number') {
    return createModifier('scaleEffect', { scale: a, anchor: b });
  }
  return createModifier('scaleEffect', a);
}
