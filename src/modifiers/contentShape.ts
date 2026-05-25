import { createModifier } from './createModifier';

export type ContentShapeKind =
  | 'rectangle'
  | 'circle'
  | 'capsule'
  | 'roundedRectangle';

export interface ContentShapeParams {
  /// The shape used for hit testing (and interaction/preview shaping).
  /// Defaults to `'rectangle'`.
  shape?: ContentShapeKind;
  /// Corner radius in points, used only when `shape` is `'roundedRectangle'`.
  cornerRadius?: number;
}

/// SwiftUI `.contentShape(_:)`. Defines the hit-testing area of the view
/// using a simple shape. Useful to make an entire (partly transparent)
/// region tappable, or to clip the touchable area to a circle/capsule.
export function contentShape(
  shape?: ContentShapeKind | ContentShapeParams
) {
  if (typeof shape === 'string') {
    return createModifier('contentShape', { shape });
  }
  return createModifier('contentShape', shape ?? {});
}
