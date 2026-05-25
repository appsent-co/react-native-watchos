import { createModifier } from './createModifier';

export interface GlassEffectIDParams {
  /// Identifier associating this glass element with others in the same
  /// container so they can morph/merge during transitions.
  id: string;
}

/// SwiftUI `.glassEffectID(_:in:)` (watchOS 26 "Liquid Glass").
///
/// [LIMITED] The real API requires a `Namespace.ID` shared across the views
/// that should morph into one another. The bridge can't yet share a single
/// `@Namespace` across independently-rendered native nodes, so the native
/// side uses a *local* namespace per applied view. The `id` is still honored
/// within that view, but cross-view union/morph animations (which need a
/// shared namespace) are not bridged in v1.
export function glassEffectID(id: string) {
  return createModifier('glassEffectID', { id });
}
