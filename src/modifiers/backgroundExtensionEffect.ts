import { createModifier } from './createModifier';

/// SwiftUI `.backgroundExtensionEffect()` (watchOS 26 "Liquid Glass").
/// Extends the view's content beneath adjacent Liquid Glass surfaces by
/// mirroring/blurring it, so the glass picks up the underlying color.
/// Takes no parameters. No-op on watchOS < 26.
export function backgroundExtensionEffect() {
  return createModifier('backgroundExtensionEffect');
}
