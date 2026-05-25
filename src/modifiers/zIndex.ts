import { createModifier } from './createModifier';

export interface ZIndexParams {
  /// Stacking order within the parent. Higher values render in front of
  /// lower ones. Defaults to `0`.
  value?: number;
}

/// SwiftUI `.zIndex(_:)`. Controls the front-to-back ordering of this view
/// among overlapping siblings in the same container.
export function zIndex(
  params: ZIndexParams
): ReturnType<typeof createModifier>;
export function zIndex(value: number): ReturnType<typeof createModifier>;
export function zIndex(a: ZIndexParams | number) {
  if (typeof a === 'number') {
    return createModifier('zIndex', { value: a });
  }
  return createModifier('zIndex', a);
}
