import type { ReactNode } from 'react';
import { createModifier } from './createModifier';

export interface SearchSuggestionsParams {
  /// The suggestion views shown beneath a searchable field. Each child may
  /// carry a `searchCompletion(...)` modifier so tapping it fills the search
  /// field. Hoisted across the bridge as modifier content.
  content: ReactNode;
}

/// SwiftUI `.searchSuggestions { … }`.
///
/// Supplies the suggestion views for a searchable context. Available on
/// watchOS 9+ (the bridge deployment target); the native side still gates
/// defensively and falls back to the unmodified view on older systems.
///
/// The suggestions only render when this view is also marked searchable; on
/// a non-searchable view the modifier is an inert pass-through.
export function searchSuggestions(params: SearchSuggestionsParams) {
  return createModifier('searchSuggestions', params);
}
