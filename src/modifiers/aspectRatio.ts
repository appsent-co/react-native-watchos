import { createModifier } from './createModifier';

export interface AspectRatioParams {
  /// Width / height ratio. When omitted, the view's intrinsic ratio is
  /// preserved (only `contentMode` is enforced).
  ratio?: number;
  /// `'fit'` shrinks the view to fit the available space without
  /// cropping; `'fill'` expands to fill, cropping overflow. Default
  /// is `'fit'`.
  contentMode?: 'fit' | 'fill';
}

/// SwiftUI `.aspectRatio(_:contentMode:)`. Generic — works on any view.
export function aspectRatio(params?: AspectRatioParams | number) {
  if (typeof params === 'number') {
    return createModifier('aspectRatio', { ratio: params });
  }
  return createModifier('aspectRatio', params);
}
