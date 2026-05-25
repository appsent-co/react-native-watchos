import { createModifier } from './createModifier';

/// Navigation transition style. `'zoom'` zooms from a matching
/// `matchedTransitionSource`; `'automatic'` uses the system default.
export type NavigationTransitionType = 'automatic' | 'zoom';

export interface NavigationTransitionParams {
  /// Transition style. Defaults to `'automatic'`.
  type?: NavigationTransitionType;
  /// For `type: 'zoom'`, the id of the paired `matchedTransitionSource`.
  id?: string;
}

/// SwiftUI `.navigationTransition(_:)` (watchOS 11+ / iOS 18+). Sets the
/// transition used when this view is pushed/popped in a navigation stack.
///
/// LIMITATION: `'zoom'` requires a shared namespace between this view and
/// its `matchedTransitionSource`; the bridge cannot share a namespace
/// across nodes in v1, so `'zoom'` falls back to the default transition.
/// On watchOS < 11 the whole modifier is a no-op (view passes through).
export function navigationTransition(
  params: NavigationTransitionParams | NavigationTransitionType = {}
) {
  if (typeof params === 'string') {
    return createModifier('navigationTransition', { type: params });
  }
  return createModifier('navigationTransition', params);
}
