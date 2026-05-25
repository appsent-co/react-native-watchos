import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export type SafeAreaInsetEdge = 'top' | 'bottom' | 'leading' | 'trailing';

export interface SafeAreaInsetParams {
  /// Edge to inset and place `content` against. `'top'` / `'bottom'` use a
  /// horizontal alignment; `'leading'` / `'trailing'` use a vertical one.
  edge: SafeAreaInsetEdge;
  /// Alignment of `content` along the edge. Defaults to `'center'`.
  alignment?: string;
  /// Spacing between `content` and the main view's content. Defaults to
  /// SwiftUI's automatic spacing when omitted.
  spacing?: number;
  /// View rendered in the reserved safe-area inset region.
  content: ReactNode;
}

/// SwiftUI `.safeAreaInset(edge:alignment:spacing:content:)`. Reserves space
/// along an edge of the view and places `content` there, shrinking the main
/// content's safe area to make room.
export function safeAreaInset(params: SafeAreaInsetParams) {
  return createModifier('safeAreaInset', params);
}
