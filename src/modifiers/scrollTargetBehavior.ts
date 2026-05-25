import { createModifier } from './createModifier';

/// `paging` snaps a page at a time; `viewAligned` snaps to views marked
/// with `scrollTargetLayout()`.
export type ScrollTargetBehaviorKind = 'paging' | 'viewAligned';

export interface ScrollTargetBehaviorParams {
  behavior: ScrollTargetBehaviorKind;
}

/// SwiftUI `.scrollTargetBehavior(_:)`. Sets the scroll snapping behavior
/// of the scrollable container. Gated to watchOS 10+ natively; a no-op on
/// older systems.
export function scrollTargetBehavior(
  behavior: ScrollTargetBehaviorKind
): ReturnType<typeof createModifier>;
export function scrollTargetBehavior(
  params: ScrollTargetBehaviorParams
): ReturnType<typeof createModifier>;
export function scrollTargetBehavior(
  a: ScrollTargetBehaviorKind | ScrollTargetBehaviorParams
) {
  if (typeof a === 'string') {
    return createModifier('scrollTargetBehavior', { behavior: a });
  }
  return createModifier('scrollTargetBehavior', a);
}
