import { createModifier } from './createModifier';

/// How a presentation adapts to a compact size class. Mirrors SwiftUI's
/// `PresentationAdaptation`.
export type PresentationAdaptation =
  | 'automatic'
  | 'none'
  | 'popover'
  | 'sheet'
  | 'fullScreenCover';

/// SwiftUI `.presentationCompactAdaptation(_:)`. Specifies how a
/// presentation should adapt when running in a horizontally and vertically
/// compact size class. Defaults to `'automatic'`.
///
/// NOTE: `presentationCompactAdaptation` is **not available on watchOS**
/// (iOS 16.4+ / macOS 13.3+ only). On watchOS this modifier is a
/// documented no-op — accepted for cross-platform JS parity, applies
/// nothing.
export function presentationCompactAdaptation(
  adaptation: PresentationAdaptation = 'automatic'
) {
  return createModifier('presentationCompactAdaptation', { adaptation });
}
