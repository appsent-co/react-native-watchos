import { createModifier } from './createModifier';

export interface PaddingParams {
  /// Uniform padding on all four edges. Overridden by more specific keys.
  all?: number;
  /// Horizontal padding (leading + trailing).
  horizontal?: number;
  /// Vertical padding (top + bottom).
  vertical?: number;
  top?: number;
  bottom?: number;
  leading?: number;
  trailing?: number;
}

/// SwiftUI `.padding(_:)`. Pass no arg for system default padding (8pt on
/// watchOS); pass a number for uniform padding; pass an object for
/// per-edge values. Later keys override earlier ones.
export function padding(params?: PaddingParams | number) {
  if (typeof params === 'number') {
    return createModifier('padding', { all: params });
  }
  return createModifier('padding', params);
}
