import SwiftUI

/// Aggregator for the "Transforms" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWTransformsModifiers {
    @MainActor
    static func registerAll() {
        RNWRotationEffectModifier.register(into: .shared)
        RNWRotation3DEffectModifier.register(into: .shared)
        RNWScaleEffectModifier.register(into: .shared)
        RNWTransformEffectModifier.register(into: .shared)
        RNWProjectionEffectModifier.register(into: .shared)
    }
}
