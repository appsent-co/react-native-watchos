import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface SheetParams {
  /// Whether the sheet is shown. JS owns the source of truth; the native
  /// side mirrors it in local `@State` so the presentation is responsive
  /// and converges on the JS value.
  isPresented: boolean;
  /// Fired with the new boolean whenever the presentation state changes
  /// (shown on the modeled binding, or `false` on interactive dismiss).
  onChange?: (isPresented: boolean) => void;
  /// The sheet's content.
  content: ReactNode;
}

/// SwiftUI `.sheet(isPresented:onDismiss:content:)`. Presents `content`
/// modally when `isPresented` is true. The boolean is bound two-way so
/// an interactive (swipe-down) dismiss reports back to JS via `onChange`.
export function sheet(params: SheetParams) {
  const { isPresented, onChange, content } = params;
  return createModifier('sheet', { isPresented, handler: onChange, content });
}
