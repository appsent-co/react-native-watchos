import { createModifier } from './createModifier';

export interface HueRotationParams {
  /// Rotation angle applied to the view's colors, in degrees.
  degrees: number;
}

/// SwiftUI `.hueRotation(_:)`. Shifts every color's hue by the given
/// angle (in degrees) around the color wheel.
export function hueRotation(
  params: HueRotationParams
): ReturnType<typeof createModifier>;
export function hueRotation(
  degrees: number
): ReturnType<typeof createModifier>;
export function hueRotation(a: HueRotationParams | number) {
  if (typeof a === 'number') return createModifier('hueRotation', { degrees: a });
  return createModifier('hueRotation', a);
}
