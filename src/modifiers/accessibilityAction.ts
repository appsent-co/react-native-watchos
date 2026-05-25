import { createModifier } from './createModifier';

/// Kind of a SwiftUI named accessibility action. Omit for the default
/// (un-named) action.
/// - `'default'` — the element's primary action
/// - `'escape'` — a two-finger Z scrub / dismiss gesture
/// - `'magicTap'` — a two-finger double-tap
export type AccessibilityActionKind = 'default' | 'escape' | 'magicTap';

export interface AccessibilityActionParams {
  /// Which built-in action this handler responds to. Defaults to the
  /// element's `'default'` action.
  kind?: AccessibilityActionKind;
  /// Invoked when the action fires.
  handler: () => void;
}

/// SwiftUI `.accessibilityAction(_:_:)`. Registers a handler for a built-in
/// accessibility action so assistive-technology users can trigger it.
export function accessibilityAction(params: AccessibilityActionParams) {
  return createModifier('accessibilityAction', params);
}
