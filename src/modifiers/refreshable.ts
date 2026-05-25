import { createModifier } from './createModifier';

/// SwiftUI `.refreshable { … }`. Marks the view as refreshable and fires
/// `handler` when the user triggers a pull-to-refresh. The native closure
/// is async; the handler is invoked once per refresh gesture. The bridge
/// cannot await JS, so the refresh indicator dismisses as soon as the
/// handler is fired rather than when JS work completes. watchOS 9+.
export function refreshable(handler: () => void) {
  return createModifier('refreshable', { handler });
}
