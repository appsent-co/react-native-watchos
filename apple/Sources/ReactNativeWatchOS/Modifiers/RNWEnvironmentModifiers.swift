import SwiftUI

/// Aggregator for the "Environment" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWEnvironmentModifiers {
    @MainActor
    static func registerAll() {
        RNWHelpModifier.register(into: .shared)
        RNWEnvironmentModifier.register(into: .shared)
        RNWEnvironmentObjectModifier.register(into: .shared)
        RNWDefaultAppStorageModifier.register(into: .shared)
    }
}
