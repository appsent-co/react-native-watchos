import { createModifier } from './createModifier';

export interface LineSpacingParams {
  /// Spacing in points between lines of text.
  value?: number;
}

/// SwiftUI `.lineSpacing(_:)`. Sets the vertical distance between lines of
/// text within the view. Pass a number directly or an object.
export function lineSpacing(params?: LineSpacingParams | number) {
  if (typeof params === 'number') {
    return createModifier('lineSpacing', { value: params });
  }
  return createModifier('lineSpacing', params);
}
