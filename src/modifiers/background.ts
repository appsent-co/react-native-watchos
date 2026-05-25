import type { ReactNode } from 'react';

import { createModifier } from './createModifier';

export type BackgroundAlignment =
  | 'center'
  | 'leading'
  | 'trailing'
  | 'top'
  | 'bottom'
  | 'topLeading'
  | 'topTrailing'
  | 'bottomLeading'
  | 'bottomTrailing';

export interface BackgroundContentParams {
  /// View(s) drawn behind the modified view. Hoisted across the bridge as
  /// modifier content. Maps to SwiftUI `.background(alignment:content:)`.
  content: ReactNode;
  /// How the background is aligned within the view's bounds. Defaults to
  /// `'center'`, matching SwiftUI.
  alignment?: BackgroundAlignment;
}

/// SwiftUI `.background(_:)` with a flat color. The color string supports
/// named colors (`'red'`, `'blue'`, …), SwiftUI semantic colors
/// (`'primary'`, `'secondary'`, `'accent'`), and `#RRGGBB` / `#RRGGBBAA`.
export function background(color: string): ReturnType<typeof createModifier>;
/// SwiftUI `.background(alignment:content:)` with arbitrary view content
/// drawn behind the modified view.
export function background(
  params: BackgroundContentParams
): ReturnType<typeof createModifier>;
export function background(arg: string | BackgroundContentParams) {
  if (typeof arg === 'string') return createModifier('background', { color: arg });
  return createModifier('background', arg);
}
