import { createModifier } from './createModifier';

export type SpringLoadingBehaviorValue = 'automatic' | 'enabled' | 'disabled';

/// SwiftUI `.springLoadingBehavior(_:)` (watchOS 10+). Controls whether a
/// control activates ("spring-loads") when the user hovers a dragged item
/// over it. `'automatic'` defers to the system default. On watchOS 9 the
/// modifier is a no-op (the API is unavailable).
export function springLoadingBehavior(
  value: SpringLoadingBehaviorValue = 'automatic'
) {
  return createModifier('springLoadingBehavior', { value });
}
