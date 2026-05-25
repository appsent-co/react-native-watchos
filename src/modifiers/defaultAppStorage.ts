import { createModifier } from './createModifier';

export interface DefaultAppStorageParams {
  /// The `UserDefaults` suite name backing descendant `@AppStorage`
  /// values. When omitted (or the suite can't be opened), the standard
  /// user defaults are used.
  suiteName?: string;
}

/// SwiftUI `.defaultAppStorage(_:)`. Sets the `UserDefaults` store that
/// descendant `@AppStorage` properties read from and write to.
export function defaultAppStorage(
  params?: DefaultAppStorageParams
): ReturnType<typeof createModifier>;
export function defaultAppStorage(
  suiteName: string
): ReturnType<typeof createModifier>;
export function defaultAppStorage(a?: DefaultAppStorageParams | string) {
  if (typeof a === 'string')
    return createModifier('defaultAppStorage', { suiteName: a });
  return createModifier('defaultAppStorage', a);
}
