import SwiftUI

/// Aggregator for the "Container / grid" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWContainerGridModifiers {
    @MainActor
    static func registerAll() {
        RNWContainerShapeModifier.register(into: .shared)
        RNWContainerRelativeFrameModifier.register(into: .shared)
        RNWContainerValueModifier.register(into: .shared)
        RNWContainerBackgroundModifier.register(into: .shared)
        RNWGridCellAnchorModifier.register(into: .shared)
        RNWGridCellColumnsModifier.register(into: .shared)
        RNWGridCellUnsizedAxesModifier.register(into: .shared)
        RNWGridColumnAlignmentModifier.register(into: .shared)
    }
}
