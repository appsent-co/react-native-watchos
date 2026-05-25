import { createModifier } from './createModifier';

/// SwiftUI `.presentationCornerRadius(_:)`. Requests the corner radius of
/// the presentation (sheet) it is applied to. Pass `undefined` (or omit)
/// to restore the system default.
///
/// NOTE: `presentationCornerRadius` is **not available on watchOS**
/// (iOS 16.4+ / macOS 13.3+ only). On watchOS this modifier is a
/// documented no-op — accepted for cross-platform JS parity, applies
/// nothing.
export function presentationCornerRadius(radius?: number) {
  return createModifier('presentationCornerRadius', { radius });
}
