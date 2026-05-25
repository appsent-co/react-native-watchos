import { createModifier } from './createModifier';

/// SwiftUI `.onDisappear(perform:)`. Fires `handler` when the view disappears.
///
/// ```tsx
/// <Text modifiers={[onDisappear(() => stopTimer())]} />
/// ```
export function onDisappear(handler: () => void) {
  return createModifier('onDisappear', { handler });
}
