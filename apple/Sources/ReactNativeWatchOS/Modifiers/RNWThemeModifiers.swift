import SwiftUI

/// Aggregator for the "Theme & sizing" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWThemeModifiers {
    @MainActor
    static func registerAll() {
        RNWColorSchemeModifier.register(into: .shared)
        RNWPreferredColorSchemeModifier.register(into: .shared)
        RNWDynamicTypeSizeModifier.register(into: .shared)
        RNWRedactedModifier.register(into: .shared)
        RNWUnredactedModifier.register(into: .shared)
        RNWPrivacySensitiveModifier.register(into: .shared)
        RNWHeaderProminenceModifier.register(into: .shared)
    }
}
