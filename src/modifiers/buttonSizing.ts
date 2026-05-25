import { createModifier } from './createModifier';

/// How a button sizes itself within its container.
/// - `'fitted'` hugs the title
/// - `'flexible'` expands to fill the available width
export type ButtonSizingValue = 'automatic' | 'fitted' | 'flexible';

/// SwiftUI `.buttonSizing(_:)`.
///
/// LIMITATION: `.buttonSizing(_:)` only exists on watchOS 26+ SDKs, which is
/// newer than this package's build floor. To keep the native side compiling on
/// every supported SDK, the modifier is currently a documented no-op — the view
/// is returned unchanged. The factory still ships so callers can adopt it
/// without churn once the native side raises its SDK and wires it up.
export function buttonSizing(sizing: ButtonSizingValue = 'automatic') {
  return createModifier('buttonSizing', { sizing });
}
