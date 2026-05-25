import { createModifier } from './createModifier';

/// SwiftUI `.navigationTitle(_:)`. Apply to a view inside a
/// `<NavigationStack>` (typically the screen's root container) to
/// display `text` as the title in the watchOS navigation bar.
export function navigationTitle(text: string) {
  return createModifier('navigationTitle', { text });
}
