import { createModifier } from './createModifier';

export type SearchPresentationToolbarBehavior = 'automatic' | 'minimize';

export interface SearchPresentationToolbarBehaviorParams {
  /// How the toolbar behaves while search is presented.
  /// - `'automatic'` — system default.
  /// - `'minimize'` — minimize toolbar content while searching.
  behavior: SearchPresentationToolbarBehavior;
}

/// SwiftUI `.searchPresentationToolbarBehavior(_:)`.
///
/// Configures the toolbar behaviour while a search presentation is active.
/// This API is `unavailable` on watchOS (iOS 17.0+ / macOS 14.0+ only), so
/// the native side applies it as a no-op. The factory exists for
/// cross-platform source compatibility; it has no visible effect on watchOS.
export function searchPresentationToolbarBehavior(
  params: SearchPresentationToolbarBehaviorParams
): ReturnType<typeof createModifier>;
export function searchPresentationToolbarBehavior(
  behavior: SearchPresentationToolbarBehavior
): ReturnType<typeof createModifier>;
export function searchPresentationToolbarBehavior(
  a: SearchPresentationToolbarBehaviorParams | SearchPresentationToolbarBehavior
) {
  if (typeof a === 'string') {
    return createModifier('searchPresentationToolbarBehavior', { behavior: a });
  }
  return createModifier('searchPresentationToolbarBehavior', a);
}
