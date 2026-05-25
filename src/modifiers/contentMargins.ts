import { createModifier } from './createModifier';

/// Edge name(s) the margin applies to. A single edge, one of the grouping
/// keywords, or an array of edge names — parsed natively via the shared
/// edge parser. Defaults to `all`.
export type ContentMarginEdge =
  | 'top'
  | 'bottom'
  | 'leading'
  | 'trailing'
  | 'horizontal'
  | 'vertical'
  | 'all';

export interface ContentMarginsParams {
  /// Edges to inset. Defaults to `all`.
  edges?: ContentMarginEdge | ContentMarginEdge[];
  /// Margin length in points.
  length: number;
}

/// SwiftUI `.contentMargins(_:_:for:)`. Adds margins around the content of
/// a scrollable view (applied for the `.scrollContent` placement). Gated
/// to watchOS 10+ natively; a no-op on older systems.
export function contentMargins(
  length: number
): ReturnType<typeof createModifier>;
export function contentMargins(
  params: ContentMarginsParams
): ReturnType<typeof createModifier>;
export function contentMargins(a: number | ContentMarginsParams) {
  if (typeof a === 'number') {
    return createModifier('contentMargins', { edges: 'all', length: a });
  }
  return createModifier('contentMargins', { edges: 'all', ...a });
}
