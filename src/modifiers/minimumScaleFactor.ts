import { createModifier } from './createModifier';

export interface MinimumScaleFactorParams {
  /// Smallest fraction of the font size text may shrink to (0...1) before
  /// truncating instead. E.g. `0.5` allows shrinking to half size.
  value?: number;
}

/// SwiftUI `.minimumScaleFactor(_:)`. Lets text within the view shrink to
/// fit available space down to the given fraction of its font size. Pass
/// a number directly or an object.
export function minimumScaleFactor(params?: MinimumScaleFactorParams | number) {
  if (typeof params === 'number') {
    return createModifier('minimumScaleFactor', { value: params });
  }
  return createModifier('minimumScaleFactor', params);
}
