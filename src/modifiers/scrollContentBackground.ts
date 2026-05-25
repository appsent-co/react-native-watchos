import { createModifier } from './createModifier';

/// Visibility maps to SwiftUI's `Visibility` enum.
export type ScrollContentBackgroundVisibility =
  | 'automatic'
  | 'visible'
  | 'hidden';

export interface ScrollContentBackgroundParams {
  visibility: ScrollContentBackgroundVisibility;
}

/// SwiftUI `.scrollContentBackground(_:)`. Controls whether the scroll
/// view's background is visible (e.g. hide a `List`/`Form` background to
/// show a custom one underneath). watchOS 9+.
export function scrollContentBackground(
  visibility: ScrollContentBackgroundVisibility
): ReturnType<typeof createModifier>;
export function scrollContentBackground(
  params: ScrollContentBackgroundParams
): ReturnType<typeof createModifier>;
export function scrollContentBackground(
  a: ScrollContentBackgroundVisibility | ScrollContentBackgroundParams
) {
  if (typeof a === 'string') {
    return createModifier('scrollContentBackground', { visibility: a });
  }
  return createModifier('scrollContentBackground', a);
}
