import SwiftUI

/// Aggregator for the "Accessibility & identity" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWAccessibilityModifiers {
    @MainActor
    static func registerAll() {
        RNWAccessibilityLabelModifier.register(into: .shared)
        RNWAccessibilityHintModifier.register(into: .shared)
        RNWAccessibilityValueModifier.register(into: .shared)
        RNWAccessibilityIdentifierModifier.register(into: .shared)
        RNWAccessibilityHiddenModifier.register(into: .shared)
        RNWAccessibilityAddTraitsModifier.register(into: .shared)
        RNWAccessibilityRemoveTraitsModifier.register(into: .shared)
        RNWAccessibilityElementModifier.register(into: .shared)
        RNWIdModifier.register(into: .shared)
        RNWTagModifier.register(into: .shared)
        RNWAccessibilityActionModifier.register(into: .shared)
        RNWAccessibilityActionsModifier.register(into: .shared)
    }
}
