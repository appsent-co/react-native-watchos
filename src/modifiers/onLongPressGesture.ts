import { createModifier } from './createModifier';

export interface OnLongPressGestureParams {
  /// Minimum press duration (seconds) before firing. Defaults to 0.5.
  minimumDuration?: number;
  /// Fired when the long-press gesture succeeds.
  handler: () => void;
}

/// SwiftUI `.onLongPressGesture(minimumDuration:perform:)`. Fires `handler`
/// once the press is held for `minimumDuration` seconds.
///
/// ```tsx
/// <Text modifiers={[onLongPressGesture(() => showMenu())]} />
/// ```
export function onLongPressGesture(
  handler: () => void
): ReturnType<typeof createModifier>;
export function onLongPressGesture(
  params: OnLongPressGestureParams
): ReturnType<typeof createModifier>;
export function onLongPressGesture(a: OnLongPressGestureParams | (() => void)) {
  if (typeof a === 'function') {
    return createModifier('onLongPressGesture', { handler: a });
  }
  return createModifier('onLongPressGesture', {
    minimumDuration: a.minimumDuration,
    handler: a.handler,
  });
}
