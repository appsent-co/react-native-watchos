// "Search polish" modifiers. Search-suggestion / search-toolbar refinements
// for `.searchable` contexts. Some entries are iOS-only and apply as no-ops
// on watchOS (see each factory's doc comment).
export {
  searchCompletion,
  type SearchCompletionParams,
} from './searchCompletion';
export {
  searchToolbarBehavior,
  type SearchToolbarBehavior,
  type SearchToolbarBehaviorParams,
} from './searchToolbarBehavior';
export {
  searchPresentationToolbarBehavior,
  type SearchPresentationToolbarBehavior,
  type SearchPresentationToolbarBehaviorParams,
} from './searchPresentationToolbarBehavior';
export {
  searchSuggestions,
  type SearchSuggestionsParams,
} from './searchSuggestions';
