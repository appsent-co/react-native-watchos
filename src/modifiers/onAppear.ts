import { createModifier } from './createModifier';

/// SwiftUI `.onAppear(perform:)`. Fires `handler` when the view appears.
///
/// ```tsx
/// <Text modifiers={[onAppear(() => track('seen'))]} />
/// ```
export function onAppear(handler: () => void) {
  return createModifier('onAppear', { handler });
}
