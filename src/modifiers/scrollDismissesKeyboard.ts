import { createModifier } from './createModifier';

/// Maps to SwiftUI's `ScrollDismissesKeyboardMode`.
export type ScrollDismissesKeyboardMode =
  | 'automatic'
  | 'immediately'
  | 'interactively'
  | 'never';

export interface ScrollDismissesKeyboardParams {
  mode: ScrollDismissesKeyboardMode;
}

/// SwiftUI `.scrollDismissesKeyboard(_:)`. Configures how scrolling
/// dismisses the keyboard. Gated to watchOS 10+ natively; a no-op on
/// older systems.
export function scrollDismissesKeyboard(
  mode: ScrollDismissesKeyboardMode
): ReturnType<typeof createModifier>;
export function scrollDismissesKeyboard(
  params: ScrollDismissesKeyboardParams
): ReturnType<typeof createModifier>;
export function scrollDismissesKeyboard(
  a: ScrollDismissesKeyboardMode | ScrollDismissesKeyboardParams
) {
  if (typeof a === 'string') {
    return createModifier('scrollDismissesKeyboard', { mode: a });
  }
  return createModifier('scrollDismissesKeyboard', a);
}
