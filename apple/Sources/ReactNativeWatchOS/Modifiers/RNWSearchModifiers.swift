import SwiftUI

/// Aggregator for the "Search polish" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWSearchModifiers {
    @MainActor
    static func registerAll() {
        RNWSearchCompletionModifier.register(into: .shared)
        RNWSearchToolbarBehaviorModifier.register(into: .shared)
        RNWSearchPresentationToolbarBehaviorModifier.register(into: .shared)
        RNWSearchSuggestionsModifier.register(into: .shared)
    }
}
