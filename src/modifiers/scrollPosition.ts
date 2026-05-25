import { createModifier } from './createModifier';

export interface ScrollPositionParams {
  /// The id of the currently top-most/leading visible scroll target. Pair
  /// with `scrollTargetLayout()` on the scrolled content so each child has
  /// a stable id. Two-way: JS owns the value, native mirrors it in local
  /// `@State` and reports user-driven changes through `onChange`.
  id?: string | null;
  /// Fired with the new id string (or `null`) when the scroll position
  /// changes. Passed through as the `handler` param to the native side.
  onChange?: (id: string | null) => void;
}

/// SwiftUI `.scrollPosition(id:)`. Binds the scroll position to a target
/// id. Gated to watchOS 10+ natively; a no-op on older systems.
export function scrollPosition(params: ScrollPositionParams = {}) {
  const { onChange, ...rest } = params;
  return createModifier('scrollPosition', { ...rest, handler: onChange });
}
