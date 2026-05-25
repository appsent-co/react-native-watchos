import { createModifier } from './createModifier';

/// SwiftUI `.grayscale(_:)`. Desaturates the view by `value`, where `0`
/// leaves colors unchanged and `1` is fully gray.
export function grayscale(value: number) {
  return createModifier('grayscale', { value });
}
