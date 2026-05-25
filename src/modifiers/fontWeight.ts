import { createModifier } from './createModifier';
import type { FontWeight } from './font';

export interface FontWeightParams {
  weight?: FontWeight;
}

/// SwiftUI `.fontWeight(_:)`. Sets the stroke weight of text within the
/// view. Pass a weight string directly or an object.
export function fontWeight(params?: FontWeightParams | FontWeight) {
  if (typeof params === 'string') {
    return createModifier('fontWeight', { weight: params });
  }
  return createModifier('fontWeight', params);
}
