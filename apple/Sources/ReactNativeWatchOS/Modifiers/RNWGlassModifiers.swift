import SwiftUI

/// Aggregator for the "Glass (watchOS 26)" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWGlassModifiers {
    @MainActor
    static func registerAll() {
        RNWGlassEffectModifier.register(into: .shared)
        RNWGlassEffectIDModifier.register(into: .shared)
        RNWGlassEffectTransitionModifier.register(into: .shared)
        RNWGlassEffectUnionModifier.register(into: .shared)
        RNWMaterialActiveAppearanceModifier.register(into: .shared)
        RNWBackgroundExtensionEffectModifier.register(into: .shared)
    }
}
