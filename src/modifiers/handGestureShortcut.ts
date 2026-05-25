import { createModifier } from './createModifier';

/// Which system hand-gesture (double-tap / pinch) action a view opts into.
/// `primaryAction` maps to `HandGestureShortcut.primaryAction` (treat as the
/// view's primary action); `counter` maps to `HandGestureShortcut.counter`.
export type HandGestureShortcutKind = 'primaryAction' | 'counter';

export interface HandGestureShortcutParams {
  /// The hand-gesture action this view should respond to.
  shortcut: HandGestureShortcutKind;
}

/// SwiftUI `.handGestureShortcut(_:)` — assigns a view (typically a `Button`)
/// to a system hand-gesture shortcut so it can be triggered by the Apple Watch
/// double-tap / pinch gesture. Requires watchOS 10; on older systems the view
/// is returned unchanged.
export function handGestureShortcut(
  shortcut: HandGestureShortcutKind
): ReturnType<typeof createModifier>;
export function handGestureShortcut(
  params: HandGestureShortcutParams
): ReturnType<typeof createModifier>;
export function handGestureShortcut(
  arg: HandGestureShortcutKind | HandGestureShortcutParams
) {
  if (typeof arg === 'string') {
    return createModifier('handGestureShortcut', { shortcut: arg });
  }
  return createModifier('handGestureShortcut', arg);
}
