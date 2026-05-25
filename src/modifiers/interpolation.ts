import { createModifier } from './createModifier';

export type InterpolationLevel = 'none' | 'low' | 'medium' | 'high';

/// SwiftUI `.interpolation(_:)`. Image-only — controls how the image is
/// resampled when drawn at a non-native size. `'none'` for crisp pixel
/// art; `'high'` for smooth.
export function interpolation(level: InterpolationLevel) {
  return createModifier('interpolation', { level });
}
