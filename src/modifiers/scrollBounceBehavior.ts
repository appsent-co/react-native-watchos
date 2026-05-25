import { createModifier } from './createModifier';

/// Maps to SwiftUI's `ScrollBounceBehavior`.
export type ScrollBounceBehaviorKind = 'automatic' | 'always' | 'basedOnSize';

/// Which axes the bounce behavior applies to.
export type ScrollBounceAxis = 'horizontal' | 'vertical';

export interface ScrollBounceBehaviorParams {
  behavior: ScrollBounceBehaviorKind;
  /// Axes the behavior applies to. Defaults to `['vertical']` to match
  /// SwiftUI's default `axes: [.vertical]`.
  axes?: ScrollBounceAxis | ScrollBounceAxis[];
}

/// SwiftUI `.scrollBounceBehavior(_:axes:)`. Configures the bounce
/// behavior of scrollable views along the given axes. Gated to watchOS
/// 10+ natively; a no-op on older systems.
export function scrollBounceBehavior(
  behavior: ScrollBounceBehaviorKind
): ReturnType<typeof createModifier>;
export function scrollBounceBehavior(
  params: ScrollBounceBehaviorParams
): ReturnType<typeof createModifier>;
export function scrollBounceBehavior(
  a: ScrollBounceBehaviorKind | ScrollBounceBehaviorParams
) {
  if (typeof a === 'string') {
    return createModifier('scrollBounceBehavior', { behavior: a });
  }
  return createModifier('scrollBounceBehavior', a);
}
