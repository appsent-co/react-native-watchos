import { createModifier } from './createModifier';

export type AnimationCurve =
  | 'default'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'linear'
  | 'spring'
  | 'none';

export interface AnimationParams {
  /// Curve preset. Defaults to `'default'`. Use `'none'` to disable
  /// animation (matches SwiftUI's `nil` animation argument).
  type?: AnimationCurve;
  /// Override duration in seconds. Honored by curves that accept one
  /// (`easeIn`, `easeOut`, `easeInOut`, `linear`). Ignored by `spring`.
  duration?: number;
  /// Stable hashable key. SwiftUI animates implicit changes whenever this
  /// value differs from the previous render. Pass the same value across
  /// renders to keep the animation idle; bump it (or pass the changing
  /// value itself) when an animation should fire.
  value?: string | number | boolean;
}

/// SwiftUI `.animation(_:value:)`. Wraps any view; subsequent prop or
/// child changes that happen on the same commit as a `value` change
/// animate with the chosen curve.
///
/// ```tsx
/// <ProgressView
///   value={pct}
///   modifiers={[animation({ type: 'easeIn', value: pct })]}
/// />
/// ```
export function animation(params: AnimationParams = {}) {
  return createModifier('animation', params);
}
