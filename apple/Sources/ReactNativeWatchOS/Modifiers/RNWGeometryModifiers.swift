import SwiftUI

/// Aggregator for the "Geometry hooks" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWGeometryModifiers {
    @MainActor
    static func registerAll() {
        RNWCoordinateSpaceModifier.register(into: .shared)
        RNWMatchedGeometryEffectModifier.register(into: .shared)
        RNWMatchedTransitionSourceModifier.register(into: .shared)
        RNWNavigationTransitionModifier.register(into: .shared)
        RNWOnGeometryChangeModifier.register(into: .shared)
    }
}
