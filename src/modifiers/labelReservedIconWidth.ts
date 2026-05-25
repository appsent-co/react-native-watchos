import { createModifier } from './createModifier';

/// SwiftUI `.labelReservedIconWidth(_:)`. Reserves a minimum leading width for
/// a `Label`'s icon so titles align even when some rows have no icon.
///
/// LIMITATION: `.labelReservedIconWidth(_:)` only exists on watchOS 26+ SDKs,
/// newer than this package's build floor. To keep the native side compiling on
/// every supported SDK it is currently a documented no-op — the view is
/// returned unchanged. The factory ships so callers can adopt it without churn
/// once the native side raises its SDK and wires it up.
export function labelReservedIconWidth(width: number) {
  return createModifier('labelReservedIconWidth', { width });
}
