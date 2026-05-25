import { createModifier } from './createModifier';

export interface MatchedTransitionSourceParams {
  /// Identifier pairing this source with a destination's
  /// `navigationTransition(.zoom(sourceID:in:))`.
  id: string;
}

/// SwiftUI `.matchedTransitionSource(id:in:)` (watchOS 11+ / iOS 17+).
/// Marks the view as the source for a zoom navigation transition.
///
/// LIMITATION: like `matchedGeometryEffect`, the bridge owns a *local*
/// namespace per modifier, so the source/destination namespace cannot be
/// shared across separate nodes through this bridge in v1. On watchOS < 11
/// this is a no-op (view passes through unchanged).
export function matchedTransitionSource(params: MatchedTransitionSourceParams): ReturnType<typeof createModifier>;
export function matchedTransitionSource(id: string): ReturnType<typeof createModifier>;
export function matchedTransitionSource(a: MatchedTransitionSourceParams | string) {
  if (typeof a === 'string') return createModifier('matchedTransitionSource', { id: a });
  return createModifier('matchedTransitionSource', a);
}
