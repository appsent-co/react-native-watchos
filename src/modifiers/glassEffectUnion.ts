import { createModifier } from './createModifier';

export interface GlassEffectUnionParams {
  /// Union identifier. Views sharing the same `id` (and namespace) merge
  /// their glass shapes into a single continuous element.
  id: string;
}

/// SwiftUI `.glassEffectUnion(id:namespace:)` (watchOS 26 "Liquid Glass").
///
/// [LIMITED] Merging multiple glass elements into one shape requires a
/// `Namespace.ID` shared across all the participating views. The bridge can't
/// yet share one `@Namespace` across independently-rendered native nodes, so
/// the native side falls back to a *local* namespace per applied view —
/// honoring `id` within that view as a best effort. True cross-view unions
/// (multiple sibling views melding) are not bridged in v1.
export function glassEffectUnion(id: string) {
  return createModifier('glassEffectUnion', { id });
}
