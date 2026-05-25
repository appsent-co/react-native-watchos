import { createModifier } from './createModifier';

/// How responsive the bound value is to crown rotation. Maps to
/// `DigitalCrownRotationalSensitivity`.
export type DigitalCrownSensitivity = 'low' | 'medium' | 'high';

export interface DigitalCrownRotationParams {
  /// Current value (JS owns the source of truth). The native side mirrors
  /// this into local `@State` for smooth crown tracking and converges on the
  /// next snapshot.
  value: number;
  /// Fired as the crown rotates, with the new value. JS should store it and
  /// feed it back via `value`.
  handler: (value: number) => void;
  /// Lower bound of the rotation range. Defaults to 0 when `through` is set.
  from?: number;
  /// Upper bound of the rotation range. Defaults to 1 when `from` is set.
  through?: number;
  /// Rotation sensitivity. Defaults to SwiftUI's `.high`.
  sensitivity?: DigitalCrownSensitivity;
}

/// SwiftUI `.digitalCrownRotation(_:from:through:sensitivity:…)` — binds the
/// Digital Crown to a numeric value. Available on watchOS 9 (the deployment
/// floor). When `from`/`through` are omitted the plain
/// `.digitalCrownRotation(_:)` binding overload is used.
export function digitalCrownRotation(params: DigitalCrownRotationParams) {
  return createModifier('digitalCrownRotation', params);
}
