import SwiftUI

/// Aggregator for the "Image / symbol" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWImageSymbolModifiers {
    @MainActor
    static func registerAll() {
        RNWImageScaleModifier.register(into: .shared)
        RNWSymbolRenderingModeModifier.register(into: .shared)
        RNWSymbolVariantModifier.register(into: .shared)
        RNWSymbolEffectModifier.register(into: .shared)
    }
}
