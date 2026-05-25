import { createModifier } from './createModifier';

export interface ContainerValueParams {
  /// The container-values key to set. Only keys the native side knows how
  /// to resolve take effect.
  key: string;
  /// The value to associate with `key`.
  value?: unknown;
}

/// SwiftUI `.containerValue(_:_:)` (watchOS 11+). This sets a value for a
/// `ContainerValues` key path so a custom container can read it back.
///
/// LIMITATION: `ContainerValues` keys are defined by a Swift
/// `@Entry`/`EnvironmentKey`-style declaration and addressed by static
/// key path — there is no general way to look one up from a runtime string
/// across the bridge. The native side therefore implements this as a no-op
/// (the view is returned unchanged). Kept for API completeness so JS that
/// references it still type-checks.
export function containerValue(params: ContainerValueParams) {
  return createModifier('containerValue', params);
}
