import { createModifier } from './createModifier';

/// SwiftUI `.labelIconToTitleSpacing(_:)`. Sets the spacing between a `Label`'s
/// icon and its title.
///
/// LIMITATION: `.labelIconToTitleSpacing(_:)` only exists on watchOS 26+ SDKs,
/// newer than this package's build floor. To keep the native side compiling on
/// every supported SDK it is currently a documented no-op — the view is
/// returned unchanged. The factory ships so callers can adopt it without churn
/// once the native side raises its SDK and wires it up.
export function labelIconToTitleSpacing(spacing: number) {
  return createModifier('labelIconToTitleSpacing', { spacing });
}
