import { createModifier } from './createModifier';

export interface CornerRadiusParams {
  /// Corner radius in points.
  radius: number;
}

/// SwiftUI `.cornerRadius(_:)`. Clips the view to a rounded rectangle of the
/// given corner radius. Deprecated in newer SDKs in favor of
/// `.clipShape(RoundedRectangle(...))`, but still available on watchOS 9+.
export function cornerRadius(
  params: CornerRadiusParams | number
): ReturnType<typeof createModifier> {
  if (typeof params === 'number') return createModifier('cornerRadius', { radius: params });
  return createModifier('cornerRadius', params);
}
