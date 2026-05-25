import { createModifier } from './createModifier';
import type { UnitPoint } from '../components/LinearGradient';

export interface DefaultScrollAnchorParams {
  /// A named `UnitPoint` ('top' | 'center' | 'bottom' | …) or an explicit
  /// `{ x, y }` in unit space.
  anchor: UnitPoint;
}

/// SwiftUI `.defaultScrollAnchor(_:)`. Sets the initial anchor the scroll
/// view aligns to (and re-aligns to when content size changes). Gated to
/// watchOS 10+ natively; a no-op on older systems.
export function defaultScrollAnchor(
  anchor: UnitPoint
): ReturnType<typeof createModifier>;
export function defaultScrollAnchor(
  params: DefaultScrollAnchorParams
): ReturnType<typeof createModifier>;
export function defaultScrollAnchor(
  a: UnitPoint | DefaultScrollAnchorParams
) {
  if (typeof a === 'string' || ('x' in a && 'y' in a)) {
    return createModifier('defaultScrollAnchor', { anchor: a });
  }
  return createModifier('defaultScrollAnchor', a);
}
