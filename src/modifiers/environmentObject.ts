import { createModifier } from './createModifier';

export interface EnvironmentObjectParams {
  /// Accepted for API symmetry only — see below. The object never
  /// reaches SwiftUI.
  object?: unknown;
}

/// SwiftUI `.environmentObject(_:)`.
///
/// UNSUPPORTED on this bridge: `.environmentObject` injects a reference-type
/// `ObservableObject` into the SwiftUI environment so descendant views can
/// `@EnvironmentObject` it. A plain JS value cannot be made into a Swift
/// `ObservableObject` (it has no `objectWillChange` publisher and no native
/// identity), and the native view tree has no JS-side observers to feed.
/// Registered as a no-op so the factory exists and composes; the view is
/// returned unchanged. Use the `modifiers` prop with concrete value
/// modifiers (e.g. `environment`) for cross-cutting state instead.
export function environmentObject(params?: EnvironmentObjectParams) {
  return createModifier('environmentObject', params);
}
