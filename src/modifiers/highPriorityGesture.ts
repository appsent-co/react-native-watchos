import { createModifier } from './createModifier';
import type { GestureParams } from './gesture';

/// SwiftUI `.highPriorityGesture(_:)`. Attaches a gesture that takes
/// precedence over the view's own gestures, recognizing before them.
///
/// **Limited (v1):** same bridging constraints as `gesture` — only `'tap'`
/// and `'longPress'` are supported; arbitrary SwiftUI `Gesture` values are
/// not expressible across the bridge.
export function highPriorityGesture(params: GestureParams) {
  return createModifier('highPriorityGesture', params);
}
