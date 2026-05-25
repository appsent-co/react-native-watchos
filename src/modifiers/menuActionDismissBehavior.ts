import { createModifier } from './createModifier';

/// Whether tapping a menu item dismisses the presenting menu.
export type MenuActionDismissBehaviorValue =
  | 'automatic'
  | 'enabled'
  | 'disabled';

/// SwiftUI `.menuActionDismissBehavior(_:)`. Use `'disabled'` to keep a menu
/// open after the user selects an action.
///
/// Requires watchOS 10+. On earlier systems this is a no-op (the view is
/// returned unchanged).
export function menuActionDismissBehavior(
  behavior: MenuActionDismissBehaviorValue = 'automatic'
) {
  return createModifier('menuActionDismissBehavior', { behavior });
}
