import { createModifier } from './createModifier';

/// Which geometry properties participate in the matched-geometry effect.
/// Mirrors SwiftUI's `MatchedGeometryProperties` option set.
export type MatchedGeometryProperty = 'position' | 'size' | 'frame';

export interface MatchedGeometryEffectParams {
  /// Identifier for this geometry group. Within a single namespace, the
  /// source view and the views matching it share the same `id`.
  id: string;
  /// Which geometry properties to match. Defaults to `'frame'`
  /// (position + size), matching SwiftUI.
  properties?: MatchedGeometryProperty;
  /// Whether this view is the source of the geometry. Defaults to `true`.
  isSource?: boolean;
}

/// SwiftUI `.matchedGeometryEffect(id:in:properties:isSource:)`.
///
/// LIMITATION (v1): SwiftUI matches geometry across views that share a
/// single `@Namespace`. This bridge applies the effect through a
/// `ViewModifier` that owns a *local* namespace, so the effect is scoped
/// to a single view and CANNOT match geometry across separate views/nodes.
/// Cross-view matched-geometry transitions are not supported in v1; use it
/// for self-contained geometry tagging only.
export function matchedGeometryEffect(params: MatchedGeometryEffectParams) {
  return createModifier('matchedGeometryEffect', params);
}
