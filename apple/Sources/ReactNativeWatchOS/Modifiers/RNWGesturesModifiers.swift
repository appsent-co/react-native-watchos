import SwiftUI

/// Aggregator for the "Gestures" modifier unit. Each modifier in this
/// category registers itself from `registerAll()` so `RNWRootView`
/// wires the whole unit with a single call. One unit owns this file —
/// fill the body as you add `RNW<Name>Modifier` files for this category.
enum RNWGesturesModifiers {
    @MainActor
    static func registerAll() {
        RNWAllowsHitTestingModifier.register(into: .shared)
        RNWContentShapeModifier.register(into: .shared)
        RNWSpringLoadingBehaviorModifier.register(into: .shared)
        RNWGestureModifier.register(into: .shared)
        RNWSimultaneousGestureModifier.register(into: .shared)
        RNWHighPriorityGestureModifier.register(into: .shared)
    }
}
