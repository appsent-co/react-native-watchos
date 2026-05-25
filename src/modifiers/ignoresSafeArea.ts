import { createModifier } from './createModifier';

export type SafeAreaEdge =
  | 'top'
  | 'bottom'
  | 'leading'
  | 'trailing'
  | 'horizontal'
  | 'vertical'
  | 'all';

export interface IgnoresSafeAreaParams {
  /// Edges along which to extend beyond the safe area. Accepts a single
  /// edge name, `'horizontal'` / `'vertical'` / `'all'`, or an array of
  /// edge names. Defaults to `'all'`.
  edges?: SafeAreaEdge | SafeAreaEdge[];
}

/// SwiftUI `.ignoresSafeArea(_:edges:)`. Lets the view draw into the safe
/// area on the chosen edges (e.g. under the watch bezel insets).
export function ignoresSafeArea(params: IgnoresSafeAreaParams = {}) {
  return createModifier('ignoresSafeArea', params);
}
