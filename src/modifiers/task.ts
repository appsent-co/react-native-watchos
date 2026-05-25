import { createModifier } from './createModifier';

/// SwiftUI `.task(priority:_:)`. Fires `handler` once when the view appears
/// (the bridged async task simply invokes the JS callback). Use it for
/// load-on-appear side effects.
///
/// ```tsx
/// <Text modifiers={[task(() => load())]} />
/// ```
export function task(handler: () => void) {
  return createModifier('task', { handler });
}
