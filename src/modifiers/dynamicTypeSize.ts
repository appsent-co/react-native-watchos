import { createModifier } from './createModifier';

/// SwiftUI `DynamicTypeSize` values, from `.xSmall` up through the five
/// accessibility sizes.
export type DynamicTypeSize =
  | 'xSmall'
  | 'small'
  | 'medium'
  | 'large'
  | 'xLarge'
  | 'xxLarge'
  | 'xxxLarge'
  | 'accessibility1'
  | 'accessibility2'
  | 'accessibility3'
  | 'accessibility4'
  | 'accessibility5';

/// SwiftUI `.dynamicTypeSize(_:)`. Pins this view's subtree to a fixed
/// Dynamic Type size rather than following the system text-size setting.
/// Requires watchOS 9+ — a no-op on older systems.
export function dynamicTypeSize(size: DynamicTypeSize) {
  return createModifier('dynamicTypeSize', { size });
}
