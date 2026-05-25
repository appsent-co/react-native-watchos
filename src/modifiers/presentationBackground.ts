import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface PresentationBackgroundParams {
  /// A shape-style string resolved by the native `RNWShapeStyleParser`:
  /// a named / hex color, a hierarchical level (`'primary'` …), `'tint'`,
  /// or a material (`'thinMaterial'` …). Ignored when `content` is set.
  style?: string;
  /// A view to render behind the presentation. Takes precedence over
  /// `style` when provided.
  content?: ReactNode;
}

/// SwiftUI `.presentationBackground(_:)` / `.presentationBackground(_:){…}`.
/// Sets the background of the enclosing presentation (sheet) to either a
/// shape style (`style`) or a custom view (`content`).
///
/// NOTE: `presentationBackground` is **not available on watchOS**
/// (iOS 16.4+ / macOS 13.3+ only). On watchOS this modifier is a
/// documented no-op — accepted for cross-platform JS parity, applies
/// nothing.
export function presentationBackground(
  style: string
): ReturnType<typeof createModifier>;
export function presentationBackground(
  params: PresentationBackgroundParams
): ReturnType<typeof createModifier>;
export function presentationBackground(
  a: string | PresentationBackgroundParams
) {
  if (typeof a === 'string') {
    return createModifier('presentationBackground', { style: a });
  }
  return createModifier('presentationBackground', a);
}
