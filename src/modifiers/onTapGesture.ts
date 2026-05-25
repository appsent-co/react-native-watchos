import { createModifier } from './createModifier';

export interface OnTapGestureParams {
  /// Number of taps required to fire. Defaults to 1.
  count?: number;
  /// Fired when the tap gesture completes.
  handler: () => void;
}

/// SwiftUI `.onTapGesture(count:perform:)`. Fires `handler` after `count`
/// taps land on the view.
///
/// ```tsx
/// <Text modifiers={[onTapGesture(() => setCount((c) => c + 1))]} />
/// ```
export function onTapGesture(
  handler: () => void
): ReturnType<typeof createModifier>;
export function onTapGesture(
  params: OnTapGestureParams
): ReturnType<typeof createModifier>;
export function onTapGesture(a: OnTapGestureParams | (() => void)) {
  if (typeof a === 'function') {
    return createModifier('onTapGesture', { count: 1, handler: a });
  }
  return createModifier('onTapGesture', { count: a.count ?? 1, handler: a.handler });
}
