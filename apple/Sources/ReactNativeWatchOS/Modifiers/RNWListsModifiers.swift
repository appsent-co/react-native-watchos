import SwiftUI

/// Aggregator for the "Lists & list polish" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWListsModifiers {
    @MainActor
    static func registerAll() {
        RNWListStyleModifier.register(into: .shared)
        RNWListRowInsetsModifier.register(into: .shared)
        RNWListSectionSpacingModifier.register(into: .shared)
        RNWListItemTintModifier.register(into: .shared)
        RNWDeleteDisabledModifier.register(into: .shared)
        RNWMoveDisabledModifier.register(into: .shared)
        RNWSelectionDisabledModifier.register(into: .shared)
        RNWListRowBackgroundModifier.register(into: .shared)
    }
}
