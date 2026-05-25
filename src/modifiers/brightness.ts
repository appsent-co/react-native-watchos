import { createModifier } from './createModifier';

/// SwiftUI `.brightness(_:)`. Brightens (positive) or darkens (negative)
/// the view by adding `value` to each color component. `0` is unchanged.
export function brightness(value: number) {
  return createModifier('brightness', { value });
}
