import { createModifier } from './createModifier';

export type ClipShapeKind =
  | 'rectangle'
  | 'circle'
  | 'capsule'
  | 'ellipse'
  | 'roundedRectangle';

export interface ClipShapeParams {
  /// Which shape to clip to. Defaults to `'rectangle'`.
  shape?: ClipShapeKind;
  /// Corner radius used only when `shape` is `'roundedRectangle'`.
  cornerRadius?: number;
}

/// SwiftUI `.clipShape(_:)`. Clips the view to the given shape. For
/// `'roundedRectangle'` pass `cornerRadius` to control the corner curvature.
export function clipShape(
  params?: ClipShapeParams | ClipShapeKind
): ReturnType<typeof createModifier> {
  if (typeof params === 'string') return createModifier('clipShape', { shape: params });
  return createModifier('clipShape', params);
}
