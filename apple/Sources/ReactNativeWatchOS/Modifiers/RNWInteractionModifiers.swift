import SwiftUI

/// Aggregator for the "Interaction & lifecycle" modifier unit. Each modifier in
/// this category registers itself from `registerAll()` so `RNWRootView` wires
/// the whole unit with a single call. One unit owns this file.
enum RNWInteractionModifiers {
    @MainActor
    static func registerAll() {
        RNWDisabledModifier.register(into: .shared)
        RNWTransitionModifier.register(into: .shared)
        RNWOnTapGestureModifier.register(into: .shared)
        RNWOnLongPressGestureModifier.register(into: .shared)
        RNWOnAppearModifier.register(into: .shared)
        RNWOnDisappearModifier.register(into: .shared)
        RNWOnChangeModifier.register(into: .shared)
        RNWOnSubmitModifier.register(into: .shared)
        RNWTaskModifier.register(into: .shared)
        RNWOnReceiveModifier.register(into: .shared)
        RNWOnOpenURLModifier.register(into: .shared)
        RNWContextMenuModifier.register(into: .shared)
        RNWSwipeActionsModifier.register(into: .shared)
    }
}
