import { createModifier } from './createModifier';

/// Whether buttons repeatedly trigger their action on a press-and-hold.
export type ButtonRepeatBehaviorValue = 'automatic' | 'enabled' | 'disabled';

/// SwiftUI `.buttonRepeatBehavior(_:)`. Controls whether descendant buttons
/// fire their action repeatedly while held down.
///
/// Requires watchOS 10+. On earlier systems this is a no-op (the view is
/// returned unchanged).
export function buttonRepeatBehavior(
  behavior: ButtonRepeatBehaviorValue = 'automatic'
) {
  return createModifier('buttonRepeatBehavior', { behavior });
}
