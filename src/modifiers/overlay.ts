import type { ReactNode } from 'react';

import { createModifier } from './createModifier';

export type OverlayAlignment =
  | 'center'
  | 'leading'
  | 'trailing'
  | 'top'
  | 'bottom'
  | 'topLeading'
  | 'topTrailing'
  | 'bottomLeading'
  | 'bottomTrailing';

export interface OverlayParams {
  /// View(s) drawn in front of (on top of) the modified view. Hoisted across
  /// the bridge as modifier content.
  content: ReactNode;
  /// How the overlay is aligned within the view's bounds. Defaults to
  /// `'center'`, matching SwiftUI.
  alignment?: OverlayAlignment;
}

/// SwiftUI `.overlay(alignment:content:)`. Layers the given view(s) in front
/// of the modified view.
export function overlay(params: OverlayParams) {
  return createModifier('overlay', params);
}
