import { createModifier } from './createModifier';

export interface OpacityParams {
  /// Opacity from `0` (fully transparent) to `1` (fully opaque).
  value: number;
}

/// SwiftUI `.opacity(_:)`. Sets the transparency of the view.
export function opacity(
  params: OpacityParams | number
): ReturnType<typeof createModifier> {
  if (typeof params === 'number') return createModifier('opacity', { value: params });
  return createModifier('opacity', params);
}
