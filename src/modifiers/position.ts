import { createModifier } from './createModifier';

export interface PositionParams {
  /// X coordinate of the view's center within its parent's coordinate space.
  x?: number;
  /// Y coordinate of the view's center within its parent's coordinate space.
  y?: number;
}

/// SwiftUI `.position(x:y:)`. Places the view's center at an absolute point
/// in the parent's coordinate space, ignoring the view's own layout.
export function position(
  params: PositionParams
): ReturnType<typeof createModifier>;
export function position(
  x: number,
  y: number
): ReturnType<typeof createModifier>;
export function position(a: PositionParams | number, b?: number) {
  if (typeof a === 'number') {
    return createModifier('position', { x: a, y: b ?? 0 });
  }
  return createModifier('position', a);
}
