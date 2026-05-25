import { createModifier } from './createModifier';

/// Known environment keys this bridge can set. SwiftUI's
/// `.environment(_:_:)` is generic over arbitrary `EnvironmentValues`
/// key paths, which cannot be expressed over the JSON bridge — so only
/// this hand-picked, value-bridgeable subset is supported. Unknown keys
/// are a documented no-op on the native side.
export type EnvironmentKey =
  | 'locale'
  | 'layoutDirection'
  | 'lineSpacing'
  | 'multilineTextAlignment';

/// `.environment(\.layoutDirection, _)` values.
export type EnvironmentLayoutDirection = 'leftToRight' | 'rightToLeft';

/// `.environment(\.multilineTextAlignment, _)` values.
export type EnvironmentTextAlignment = 'leading' | 'center' | 'trailing';

export interface EnvironmentParams {
  /// Which `EnvironmentValues` key to write. Only the keys in
  /// `EnvironmentKey` are bridgeable; any other value is a no-op.
  key: EnvironmentKey;
  /// The value to write. Interpreted per `key`:
  /// - `'locale'` → a BCP-47 / POSIX identifier string (e.g. `'fr_FR'`).
  /// - `'layoutDirection'` → `'leftToRight'` | `'rightToLeft'`.
  /// - `'lineSpacing'` → a number of points.
  /// - `'multilineTextAlignment'` → `'leading'` | `'center'` | `'trailing'`.
  value: string | number | EnvironmentLayoutDirection | EnvironmentTextAlignment;
}

/// SwiftUI `.environment(_:_:)`, restricted to a bridgeable subset of
/// `EnvironmentValues` keys. Arbitrary key paths cannot cross the JSON
/// bridge, so pass one of the known `key` strings; unknown keys are a
/// no-op (the view is returned unchanged) — see `EnvironmentKey`.
export function environment(params: EnvironmentParams) {
  return createModifier('environment', params);
}
