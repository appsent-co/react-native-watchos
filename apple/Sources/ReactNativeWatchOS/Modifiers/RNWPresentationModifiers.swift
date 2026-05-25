import SwiftUI

/// Aggregator for the "Presentation polish" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWPresentationModifiers {
    @MainActor
    static func registerAll() {
        RNWInteractiveDismissDisabledModifier.register(into: .shared)
        RNWPresentationDragIndicatorModifier.register(into: .shared)
        RNWPresentationDetentsModifier.register(into: .shared)
        RNWPresentationCornerRadiusModifier.register(into: .shared)
        RNWPresentationCompactAdaptationModifier.register(into: .shared)
        RNWPresentationBackgroundModifier.register(into: .shared)
    }
}
