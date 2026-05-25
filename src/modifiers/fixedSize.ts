import { createModifier } from './createModifier';

export interface FixedSizeParams {
  /// Fix the ideal width, so the view never compresses or stretches
  /// horizontally.
  horizontal?: boolean;
  /// Fix the ideal height, so the view never compresses or stretches
  /// vertically.
  vertical?: boolean;
}

/// SwiftUI `.fixedSize()` / `.fixedSize(horizontal:vertical:)`. With no
/// params the view is fixed at its ideal size on both axes. Pass
/// `horizontal` / `vertical` booleans to fix only specific axes.
export function fixedSize(params?: FixedSizeParams) {
  return createModifier('fixedSize', params);
}
