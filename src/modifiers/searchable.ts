import { createModifier } from './createModifier';

export interface SearchableParams {
  /// Current search query. JS owns the source of truth; the native side
  /// mirrors it in local `@State` so typing feels instant.
  text: string;
  /// Fired with the new query string on every edit.
  onChange: (text: string) => void;
  /// Optional placeholder shown in the empty search field.
  prompt?: string;
}

/// SwiftUI `.searchable(text:prompt:)`. Intended to add a search field to a
/// view inside a `<NavigationStack>`, binding `text` two-way and firing
/// `onChange` with each new query.
///
/// LIMITATION: `.searchable` is `@available(watchOS, unavailable)` in
/// SwiftUI — there is no search-field affordance on watchOS — so the native
/// applier is a no-op (the view renders unchanged and `onChange` never
/// fires). This factory is kept so callers can express intent and so it can
/// be upgraded in place if a future watchOS adds the API.
export function searchable(params: SearchableParams) {
  const { text, onChange, prompt } = params;
  return createModifier('searchable', { text, handler: onChange, prompt });
}
