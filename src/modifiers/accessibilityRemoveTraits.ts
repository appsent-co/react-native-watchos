import { createModifier } from './createModifier';
import type { AccessibilityTrait } from './accessibilityAddTraits';

/// SwiftUI `.accessibilityRemoveTraits(_:)`. Removes one or more traits
/// previously inferred or added. Pass a single trait or an array; an array
/// is combined into one `AccessibilityTraits`.
export function accessibilityRemoveTraits(
  traits: AccessibilityTrait | AccessibilityTrait[]
) {
  return createModifier('accessibilityRemoveTraits', { traits });
}
