import { createModifier } from './createModifier';

/// SwiftUI `.onOpenURL(perform:)` (watchOS 9+). Fires `handler` with the
/// opened URL string when the view receives a universal link / custom-scheme
/// URL. On older systems this is a no-op.
///
/// ```tsx
/// <Text modifiers={[onOpenURL((url) => route(url))]} />
/// ```
export function onOpenURL(handler: (url: string) => void) {
  return createModifier('onOpenURL', { handler });
}
