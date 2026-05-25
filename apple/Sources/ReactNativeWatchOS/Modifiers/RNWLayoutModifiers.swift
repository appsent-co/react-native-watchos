import SwiftUI

/// Aggregator for the "Layout & sizing" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWLayoutModifiers {
    @MainActor
    static func registerAll() {
        RNWOffsetModifier.register(into: .shared)
        RNWPositionModifier.register(into: .shared)
        RNWFixedSizeModifier.register(into: .shared)
        RNWLayoutPriorityModifier.register(into: .shared)
        RNWZIndexModifier.register(into: .shared)
        RNWHiddenModifier.register(into: .shared)
        RNWAlignmentGuideModifier.register(into: .shared)
        RNWIgnoresSafeAreaModifier.register(into: .shared)
        RNWSafeAreaInsetModifier.register(into: .shared)
    }
}
