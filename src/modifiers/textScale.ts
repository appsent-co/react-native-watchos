import { createModifier } from './createModifier';

/// SwiftUI `Text.Scale` values. `'default'` is the standard text size;
/// `'secondary'` renders at a relatively smaller scale (e.g. for
/// superscript-like emphasis).
export type TextScale = 'default' | 'secondary';

/// SwiftUI `.textScale(_:)`. Scales text relative to the inherited font.
///
/// Requires watchOS 11.0+. On earlier versions the native side leaves the
/// view unchanged (no-op).
export function textScale(value: TextScale = 'default') {
  return createModifier('textScale', { value });
}
