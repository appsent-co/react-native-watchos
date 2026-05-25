import type { ReactNode } from 'react';

import { createModifier } from './createModifier';

export type MaskAlignment =
  | 'center'
  | 'leading'
  | 'trailing'
  | 'top'
  | 'bottom'
  | 'topLeading'
  | 'topTrailing'
  | 'bottomLeading'
  | 'bottomTrailing';

export interface MaskParams {
  /// The mask view(s). The modified view shows through where the mask is
  /// opaque and is hidden where the mask is transparent. Hoisted across the
  /// bridge as modifier content.
  content: ReactNode;
  /// How the mask is aligned within the view's bounds. Defaults to
  /// `'center'`, matching SwiftUI.
  alignment?: MaskAlignment;
}

/// SwiftUI `.mask(alignment:_:)`. Masks the view using the alpha channel of
/// the given mask view(s).
export function mask(params: MaskParams) {
  return createModifier('mask', params);
}
