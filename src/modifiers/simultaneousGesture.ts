import { createModifier } from './createModifier';
import type { GestureParams } from './gesture';

/// SwiftUI `.simultaneousGesture(_:)`. Attaches a gesture that recognizes
/// alongside the view's own (and any ancestor/descendant) gestures rather
/// than competing with them.
///
/// **Limited (v1):** same bridging constraints as `gesture` — only `'tap'`
/// and `'longPress'` are supported; arbitrary SwiftUI `Gesture` values are
/// not expressible across the bridge.
export function simultaneousGesture(params: GestureParams) {
  return createModifier('simultaneousGesture', params);
}

export type { GestureParams, GestureType } from './gesture';
