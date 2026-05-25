import { createModifier } from './createModifier';

export type SearchToolbarBehavior = 'automatic' | 'minimize';

export interface SearchToolbarBehaviorParams {
  /// How the search field behaves when integrated into a toolbar.
  /// - `'automatic'` — system default placement/behaviour.
  /// - `'minimize'` — collapse the search field into a button until tapped.
  behavior: SearchToolbarBehavior;
}

/// SwiftUI `.searchToolbarBehavior(_:)`.
///
/// Controls how a toolbar-integrated search field minimizes. This API is
/// `unavailable` on watchOS (iOS 17.1+ / macOS 14.1+ only), so the native
/// side applies it as a no-op. The factory is provided for cross-platform
/// source compatibility; the modifier has no visible effect on watchOS.
export function searchToolbarBehavior(
  params: SearchToolbarBehaviorParams
): ReturnType<typeof createModifier>;
export function searchToolbarBehavior(
  behavior: SearchToolbarBehavior
): ReturnType<typeof createModifier>;
export function searchToolbarBehavior(a: SearchToolbarBehaviorParams | SearchToolbarBehavior) {
  if (typeof a === 'string') return createModifier('searchToolbarBehavior', { behavior: a });
  return createModifier('searchToolbarBehavior', a);
}
