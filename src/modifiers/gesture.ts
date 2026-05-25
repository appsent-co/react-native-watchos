import { createModifier } from './createModifier';

/// The kind of gesture to attach. Only `'tap'` and `'longPress'` are
/// bridgeable in v1 — a general SwiftUI `Gesture` value (drag, magnify,
/// rotate, composed gestures, value payloads) cannot cross the JS bridge,
/// so it is intentionally unsupported.
export type GestureType = 'tap' | 'longPress';

export interface GestureParams {
  /// Which gesture to recognize. Defaults to `'tap'`.
  type?: GestureType;
  /// For `type: 'tap'` — the number of taps required to fire. Defaults to 1.
  count?: number;
  /// For `type: 'longPress'` — minimum press duration in seconds before the
  /// gesture fires. Defaults to SwiftUI's standard long-press duration.
  minimumDuration?: number;
  /// Fired when the gesture completes (tap recognized / long press ended).
  handler: () => void;
}

/// SwiftUI `.gesture(_:)`.
///
/// **Limited (v1):** only `'tap'` (building a `TapGesture`) and `'longPress'`
/// (building a `LongPressGesture`) are bridged. An arbitrary SwiftUI
/// `Gesture` — including drag/magnify/rotate, gesture composition, and
/// gestures that emit value payloads — is not expressible across the bridge.
/// `handler` is invoked on `.onEnded` (the gesture's action).
export function gesture(params: GestureParams) {
  return createModifier('gesture', params);
}
