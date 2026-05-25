import SwiftUI

/// Aggregator for the "Button & label polish" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWControlsPolishModifiers {
    @MainActor
    static func registerAll() {
        RNWButtonBorderShapeModifier.register(into: .shared)
        RNWButtonRepeatBehaviorModifier.register(into: .shared)
        RNWButtonSizingModifier.register(into: .shared)
        RNWMenuActionDismissBehaviorModifier.register(into: .shared)
        RNWMenuOrderModifier.register(into: .shared)
        RNWLabelsHiddenModifier.register(into: .shared)
        RNWLabelsVisibilityModifier.register(into: .shared)
        RNWLabelIconToTitleSpacingModifier.register(into: .shared)
        RNWLabelReservedIconWidthModifier.register(into: .shared)
    }
}
