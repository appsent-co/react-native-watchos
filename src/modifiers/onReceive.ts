import { createModifier } from './createModifier';

export interface OnReceiveParams {
  /// The `NotificationCenter` notification name to subscribe to. This is the
  /// only Combine publisher expressible across the bridge — see limitation.
  name: string;
  /// Fired each time a matching notification is posted.
  handler: () => void;
}

/// SwiftUI `.onReceive(_:perform:)`.
///
/// LIMITATION: SwiftUI's `.onReceive` takes an arbitrary Combine publisher,
/// which has no JS equivalent. This binding maps it to
/// `NotificationCenter.default.publisher(for:)` keyed by a notification
/// `name`, and fires `handler` on each delivery. Without a `name` it is a
/// no-op on the native side.
///
/// ```tsx
/// <Text modifiers={[onReceive('MyEvent', () => refresh())]} />
/// ```
export function onReceive(
  name: string,
  handler: () => void
): ReturnType<typeof createModifier>;
export function onReceive(
  params: OnReceiveParams
): ReturnType<typeof createModifier>;
export function onReceive(a: OnReceiveParams | string, handler?: () => void) {
  if (typeof a === 'string') {
    return createModifier('onReceive', { name: a, handler });
  }
  return createModifier('onReceive', { name: a.name, handler: a.handler });
}
