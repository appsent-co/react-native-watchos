import { createModifier } from './createModifier';

/// How a glass element animates in/out as it appears or disappears.
/// `materialize` is the default Liquid Glass materialize transition;
/// `identity` disables the transition; `matchedGeometry` drives the
/// transition from a matched-geometry source.
export type GlassEffectTransitionType =
  | 'materialize'
  | 'identity'
  | 'matchedGeometry';

export interface GlassEffectTransitionParams {
  /// The transition style. Defaults to `materialize`.
  transition?: GlassEffectTransitionType;
}

/// SwiftUI `.glassEffectTransition(_:)` (watchOS 26 "Liquid Glass").
/// Controls how the glass effect transitions when the view is inserted or
/// removed. No-op on watchOS < 26.
export function glassEffectTransition(
  transition: GlassEffectTransitionType = 'materialize'
) {
  return createModifier('glassEffectTransition', { transition });
}
