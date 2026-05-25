import { createModifier } from './createModifier';

export interface LayoutPriorityParams {
  /// Priority used when the layout system distributes space among siblings.
  /// Higher values win more of the available space. Defaults to `0`.
  value?: number;
}

/// SwiftUI `.layoutPriority(_:)`. Sets how strongly this view claims space
/// relative to its siblings in a stack.
export function layoutPriority(
  params: LayoutPriorityParams
): ReturnType<typeof createModifier>;
export function layoutPriority(
  value: number
): ReturnType<typeof createModifier>;
export function layoutPriority(a: LayoutPriorityParams | number) {
  if (typeof a === 'number') {
    return createModifier('layoutPriority', { value: a });
  }
  return createModifier('layoutPriority', a);
}
