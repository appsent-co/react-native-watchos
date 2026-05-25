import { createModifier } from './createModifier';

export interface SearchCompletionParams {
  /// The completion string offered for the search field when this view is
  /// tapped. Applied to a suggestion row inside a `.searchSuggestions` /
  /// `.searchable` context — selecting the row fills the search field with
  /// this text.
  completion: string;
}

/// SwiftUI `.searchCompletion(_:)`.
///
/// Associates a completion string with a search-suggestion view. When the
/// user taps the suggestion, the search field is filled with `completion`.
/// Only meaningful on views presented as search suggestions (i.e. inside a
/// `.searchSuggestions { … }` slot or a searchable scope); applied to any
/// other view it is a harmless no-op.
///
/// Available on watchOS 9+ (the bridge deployment target), so no availability
/// gate is required.
export function searchCompletion(
  params: SearchCompletionParams
): ReturnType<typeof createModifier>;
export function searchCompletion(
  completion: string
): ReturnType<typeof createModifier>;
export function searchCompletion(a: SearchCompletionParams | string) {
  if (typeof a === 'string') return createModifier('searchCompletion', { completion: a });
  return createModifier('searchCompletion', a);
}
