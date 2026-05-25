import { createModifier } from './createModifier';

/// SwiftUI `.scrollTargetLayout()`. Marks a layout container (e.g. the
/// `LazyVStack` inside a `ScrollView`) so its children become scroll
/// targets for `scrollTargetBehavior('viewAligned')`. Gated to watchOS
/// 10+ natively; a no-op on older systems.
export function scrollTargetLayout() {
  return createModifier('scrollTargetLayout');
}
