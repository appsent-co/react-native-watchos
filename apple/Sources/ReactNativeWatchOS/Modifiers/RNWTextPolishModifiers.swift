import SwiftUI

/// Aggregator for the "Text polish" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWTextPolishModifiers {
    @MainActor
    static func registerAll() {
        RNWKerningModifier.register(into: .shared)
        RNWTrackingModifier.register(into: .shared)
        RNWBaselineOffsetModifier.register(into: .shared)
        RNWAllowsTighteningModifier.register(into: .shared)
        RNWTextScaleModifier.register(into: .shared)
    }
}
