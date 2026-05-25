import { createModifier } from './createModifier';

/// A SwiftUI `AccessibilityTraits` member.
export type AccessibilityTrait =
  | 'isButton'
  | 'isHeader'
  | 'isImage'
  | 'isLink'
  | 'isSelected'
  | 'isSummaryElement'
  | 'startsMediaSession'
  | 'updatesFrequently'
  | 'playsSound'
  | 'allowsDirectInteraction';

/// SwiftUI `.accessibilityAddTraits(_:)`. Adds one or more traits that
/// describe the view's behaviour to assistive technologies. Pass a single
/// trait or an array; an array is combined into one `AccessibilityTraits`.
export function accessibilityAddTraits(
  traits: AccessibilityTrait | AccessibilityTrait[]
) {
  return createModifier('accessibilityAddTraits', { traits });
}
