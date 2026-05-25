import { createModifier } from './createModifier';

export interface OffsetParams {
  /// Horizontal offset in points. Positive moves the view trailing.
  x?: number;
  /// Vertical offset in points. Positive moves the view down.
  y?: number;
}

/// SwiftUI `.offset(x:y:)`. Shifts the view by the given amount *after*
/// layout, so surrounding views keep their original positions.
export function offset(params: OffsetParams): ReturnType<typeof createModifier>;
export function offset(
  x: number,
  y: number
): ReturnType<typeof createModifier>;
export function offset(a: OffsetParams | number, b?: number) {
  if (typeof a === 'number') {
    return createModifier('offset', { x: a, y: b ?? 0 });
  }
  return createModifier('offset', a);
}
